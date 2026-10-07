import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FIELDS = ['id', 'title', 'summary', 'source', 'priority', 'status', 'spec'];
const sheetCache = new Map(); // sheet id -> { at, result }
const tokenCache = new Map(); // keyPath -> { token, exp }
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

class ReadError extends Error {}

async function getToken(keyPath, now) {
  const hit = tokenCache.get(keyPath);
  if (hit && hit.exp - 60000 > now) return hit.token;
  let key;
  try { key = JSON.parse(fs.readFileSync(keyPath, 'utf8')); } catch { throw new ReadError('key file missing or unreadable'); }
  const iat = Math.floor(now / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 })}`;
  let sig;
  try { sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url'); } catch { throw new ReadError('cannot sign JWT'); }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new ReadError(`token request failed (HTTP ${res.status})`);
  const j = await res.json();
  tokenCache.set(keyPath, { token: j.access_token, exp: now + (j.expires_in || 3600) * 1000 });
  return j.access_token;
}

async function fetchRows(id, keyPath, now) {
  if (!keyPath) throw new ReadError('no key path configured');
  const token = await getToken(keyPath, now);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/A:G`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ReadError(`Sheets request failed (HTTP ${res.status})`);
  const [header = [], ...data] = (await res.json()).values || [];
  const keys = header.map((h) => String(h).trim().toLowerCase());
  return data
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((r) => Object.fromEntries(FIELDS.map((f) => [f, String(r[keys.indexOf(f)] ?? '')])));
}

export async function readRequirements(projectPath, { keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS, ttlMs = 60000, now = Date.now() } = {}) {
  let url = '';
  try { url = fs.readFileSync(path.join(projectPath, 'docs', 'specs', 'prd-tracking-sheet.txt'), 'utf8').trim(); } catch {}
  if (!url) return { status: 'no-sheet', rows: [] };
  const id = url.startsWith('https://docs.google.com/spreadsheets/') ? url.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1] : undefined;
  if (!id) return { status: 'error', rows: [], error: 'invalid Sheet URL' };
  const hit = sheetCache.get(id);
  if (hit && now - hit.at < ttlMs) return { ...hit.result, sheetUrl: url };
  try {
    const result = { status: 'ok', rows: await fetchRows(id, keyPath, now) };
    sheetCache.set(id, { at: now, result });
    return { ...result, sheetUrl: url };
  } catch (e) {
    return { status: 'error', rows: [], error: e instanceof ReadError ? e.message : 'network or parse error', sheetUrl: url };
  }
}
