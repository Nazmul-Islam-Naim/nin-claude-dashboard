import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const norm = (p) =>
  p.replace(/\\/g, '/').replace(/\/+$/, '').replace(/^([A-Za-z]):/, (_, d) => d.toLowerCase() + ':');

function* walk(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.jsonl')) yield p;
  }
}

// ponytail: reads whole file; tail-read if scan time becomes noticeable
function readSession(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  let cwd, last, sessionId, title = '', main = false;
  for (const line of text.split('\n')) {
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (!o || typeof o !== 'object') continue;
    if (o.isSidechain !== true) main = true;
    if (!cwd && o.cwd) cwd = o.cwd;
    if (!sessionId && o.sessionId) sessionId = o.sessionId;
    if (o.aiTitle) title = o.aiTitle;
    if (o.timestamp && (!last || Date.parse(o.timestamp) > Date.parse(last))) last = o.timestamp;
  }
  if (!main || !cwd || !last) return null;
  return { path: norm(cwd), sessionId: sessionId || path.basename(file, '.jsonl'), title, lastActivity: new Date(last).toISOString() };
}

export function scanSessions({ root = path.join(os.homedir(), '.claude', 'projects'), activeMinutes = 5, now = Date.now() } = {}) {
  const byPath = new Map();
  for (const file of walk(root)) {
    const s = readSession(file);
    if (!s) continue;
    if (!byPath.has(s.path)) byPath.set(s.path, []);
    byPath.get(s.path).push({ sessionId: s.sessionId, title: s.title, lastActivity: s.lastActivity });
  }
  const projects = [...byPath].map(([p, sessionList]) => {
    const lastActivity = sessionList.reduce((a, s) => (s.lastActivity > a ? s.lastActivity : a), '');
    return { path: p, sessions: sessionList.length, lastActivity, active: now - Date.parse(lastActivity) <= activeMinutes * 60000, sessionList };
  });
  return { activeMinutes, projects };
}
