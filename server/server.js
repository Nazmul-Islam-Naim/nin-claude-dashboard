import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { scanSessions } from './scanner.js';
import { readRequirements } from './sheetReader.js';
import { readSpecs } from './specReader.js';
import { aggregate, feed, pipeline } from './aggregate.js';
import { readInsights } from './insightsReader.js';
import { openProject, runProject, detectRun } from './openProject.js';
import { authMiddleware, defaultIsLocal } from './auth.js';

export function createApp({ root = process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects'), read = readRequirements, readSpec = readSpecs, spawner, now = undefined, isLocal = defaultIsLocal, token = process.env.DASHBOARD_TOKEN } = {}) {
  const app = express();
  app.use(authMiddleware({ token, isLocal }));
  let cached = { at: 0, scan: null };
  const scan = () => {
    if (Date.now() - cached.at > 2000) cached = { at: Date.now(), scan: scanSessions({ root }) };
    return cached.scan;
  };
  const full = async () => {
    const s = scan();
    const entries = await Promise.all(s.projects.map(async (p) => { const [sh, sp] = await Promise.all([read(p.path), readSpec(p.path)]); return [p.path, sh, sp]; }));
    return aggregate(s, Object.fromEntries(entries.map((e) => [e[0], e[1]])), Object.fromEntries(entries.map((e) => [e[0], e[2]])));
  };
  const wrap = (fn) => async (req, res) => {
    try { res.json(await fn(req)); } catch (e) { res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
  };
  app.get('/api/projects', wrap(async (req) => { const d = await full(); const local = isLocal(req); return { ...d, projects: d.projects.map((p) => ({ ...p, run: local ? detectRun(p.path).map((r) => `${path.relative(p.path, r.dir) || '.'}: ${r.cmd}`) : [] })), canOpen: local }; }));
  const lastOpen = new Map();
  app.post(['/api/open', '/api/run'], (req, res, next) => {
    const origin = req.headers.origin, port = req.socket.localPort;
    if (!isLocal(req)) return res.status(403).json({ ok: false, error: 'শুধু এই machine থেকে' });
    if (origin && origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) return res.status(403).json({ ok: false, error: 'অনুমতি নেই' });
    if (!req.is('application/json')) return res.status(415).json({ ok: false, error: 'JSON লাগবে' });
    next();
  }, express.json({ limit: '1kb' }), async (req, res) => {
    try {
      const name = req.body && req.body.project;
      const p = typeof name === 'string' && scan().projects.find((x) => x.path.split('/').pop() === name);
      if (!p) return res.status(404).json({ ok: false, error: 'project পাওয়া যায়নি' });
      if (Date.now() - (lastOpen.get(req.path + name) || 0) < 2000) return res.status(429).json({ ok: false, error: 'একটু পরে চেষ্টা করুন' });
      lastOpen.set(req.path + name, Date.now());
      const r = req.path === '/api/run' ? await runProject({ path: p.path, spawner }) : await openProject({ path: p.path, spawner });
      res.status(r.ok ? 200 : 500).json(r);
    } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e).slice(0, 200) }); }
  });
  app.use((err, req, res, next) => res.status(err.status || 500).json({ ok: false, error: 'অবৈধ অনুরোধ' }));
  app.get('/api/feed', wrap((req) => feed(aggregate(scan()).projects, req.query.project)));
  app.get('/api/pipeline', wrap(async (req) => pipeline((await full()).projects, req.query.project)));
  app.get('/api/insights', wrap((req) => {
    const name = req.query.project, days = req.query.days;
    const p = typeof name === 'string' && scan().projects.find((x) => x.path.split('/').pop() === name);
    return p ? readInsights(p.path, { root, days, now }) : readInsights('', { root, days, now });
  }));
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'dist');
  if (fs.existsSync(dist)) app.use(express.static(dist));
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || '127.0.0.1';
  const token = process.env.DASHBOARD_TOKEN;
  if (!['127.0.0.1', '::1', 'localhost'].includes(host) && (!token || token.length < 16)) {
    console.error(`HOST=${host} network-এ খোলা, তাই DASHBOARD_TOKEN (কমপক্ষে ১৬ অক্ষর) লাগবে। server/.env-এ দিন, অথবা HOST বাদ দিন।`);
    process.exit(1);
  }
  createApp().listen(port, host, () => {
    console.log(`dashboard API on http://${host}:${port}`);
    if (token) for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  http://${a.address}:${port}/?key=${token}`);
  });
}
