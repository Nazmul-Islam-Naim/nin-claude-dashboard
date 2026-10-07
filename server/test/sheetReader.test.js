import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { readRequirements } from '../sheetReader.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-'));
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const keyPath = path.join(tmp(), 'key.json');
fs.writeFileSync(keyPath, JSON.stringify({ client_email: 'sa@example.iam', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }));

// each test uses its own sheet id (module-level cache) and its own project dir
function project(sheetId, urlText) {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'docs', 'specs'), { recursive: true });
  if (urlText !== null) fs.writeFileSync(path.join(dir, 'docs', 'specs', 'prd-tracking-sheet.txt'), urlText ?? `https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
  return dir;
}

const HEADER = ['id', 'title', 'summary', 'source', 'priority', 'status', 'spec'];
function mockFetch(values, sheetStatus = 200) {
  const calls = { token: 0, sheets: 0 };
  globalThis.fetch = async (url) => {
    if (String(url).includes('oauth2')) { calls.token++; return Response.json({ access_token: 'tok', expires_in: 3600 }); }
    calls.sheets++;
    return sheetStatus === 200 ? Response.json({ values }) : new Response('denied', { status: sheetStatus });
  };
  return calls;
}
const opts = (now = 1_000_000) => ({ keyPath, now });

test('ok with 2 rows keyed by header', async () => {
  mockFetch([HEADER, ['R-1', 'A', 's', 'src', 'High', 'Confirmed', ''], ['R-2', 'B', 's', 'src', 'Low', 'Extracted', 'x']]);
  const r = await readRequirements(project('s1'), opts());
  assert.equal(r.status, 'ok');
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].title, 'A');
  assert.equal(r.rows[1].spec, 'x');
});

test('missing or empty txt gives no-sheet without network', async () => {
  const calls = mockFetch([]);
  assert.equal((await readRequirements(project('x', null), opts())).status, 'no-sheet');
  assert.equal((await readRequirements(project('x', '  \n'), opts())).status, 'no-sheet');
  assert.equal(calls.token + calls.sheets, 0);
});

test('invalid URL gives error', async () => {
  mockFetch([]);
  const r = await readRequirements(project('x', 'https://example.com/foo'), opts());
  assert.equal(r.status, 'error');
});

test('cache for 60 s, refetch after', async () => {
  const calls = mockFetch([HEADER, ['1', 'a', '', '', '', 'Extracted', '']]);
  const dir = project('s4');
  await readRequirements(dir, opts(1_000_000));
  await readRequirements(dir, opts(1_030_000));
  assert.equal(calls.sheets, 1);
  await readRequirements(dir, opts(1_061_000));
  assert.equal(calls.sheets, 2);
});

test('same Sheet in two projects, one request', async () => {
  const calls = mockFetch([HEADER, ['1', 'a', '', '', '', 'Extracted', '']]);
  await readRequirements(project('s5'), opts());
  await readRequirements(project('s5'), opts());
  assert.equal(calls.sheets, 1);
});

test('HTTP 403 gives error, no key material', async () => {
  mockFetch([], 403);
  const r = await readRequirements(project('s6'), opts());
  assert.equal(r.status, 'error');
  assert.ok(!r.error.includes('private_key'));
  assert.ok(!r.error.includes('BEGIN'));
});

test('missing key file gives error', async () => {
  mockFetch([HEADER]);
  const r = await readRequirements(project('s7'), { keyPath: path.join(tmp(), 'none.json'), now: 5_000_000_000 });
  assert.equal(r.status, 'error');
});

test('blank rows dropped, short row padded', async () => {
  mockFetch([HEADER, ['1', 'a'], [], ['', ' '], ['2', 'b', 's', 'src', 'p', 'Rejected']]);
  const r = await readRequirements(project('s8'), opts());
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].status, '');
  assert.equal(r.rows[1].spec, '');
});

test('non-Google or javascript URLs are invalid, no sheetUrl', async () => {
  mockFetch([]);
  for (const u of ['javascript:alert(1)', 'https://evil.com/spreadsheets/d/abc/edit', 'https://docs.google.com/spreadsheets/']) {
    const r = await readRequirements(project('x', u), opts());
    assert.equal(r.status, 'error');
    assert.equal(r.error, 'invalid Sheet URL');
    assert.equal('sheetUrl' in r, false);
  }
});

test('sheetUrl on ok and on 403 error, none on no-sheet', async () => {
  mockFetch([HEADER]);
  const url = 'https://docs.google.com/spreadsheets/d/s9/edit';
  assert.equal((await readRequirements(project('s9', `  ${url}\n`), opts())).sheetUrl, url);
  mockFetch([], 403);
  const e = await readRequirements(project('s10'), opts());
  assert.equal(e.status, 'error');
  assert.equal(e.sheetUrl, 'https://docs.google.com/spreadsheets/d/s10/edit');
  assert.equal('sheetUrl' in (await readRequirements(project('x', null), opts())), false);
});
