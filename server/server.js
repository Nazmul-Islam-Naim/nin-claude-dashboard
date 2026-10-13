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
import { openProject } from './openProject.js';
import { createRunManager } from './runManager.js';
import { listPlugins, setPlugin } from './pluginsReader.js';
import { authMiddleware, defaultIsLocal } from './auth.js';

export function createApp({ root = process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects'), read = readRequirements, readSpec = readSpecs, spawner, now = undefined, isLocal = defaultIsLocal, token = process.env.DASHBOARD_TOKEN, runs = createRunManager({ spawner }), claudeHome: home = undefined } = {}) {
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
  app.get('/api/projects', wrap(async (req) => {
    const d = await full(), local = isLocal(req);
    return { ...d, projects: d.projects.map((p) => { const services = local ? runs.services(p.path) : []; return { ...p, run: services.map((x) => x.key), services }; }), canOpen: local };
  }));
  const lastOpen = new Map();
  const guard = (req, res, next) => {
    const origin = req.headers.origin, port = req.socket.localPort;
    if (!isLocal(req)) return res.status(403).json({ ok: false, error: 'Only from this machine' });
    if (origin && origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) return res.status(403).json({ ok: false, error: 'Not allowed' });
    if (!req.is('application/json')) return res.status(415).json({ ok: false, error: 'JSON required' });
    next();
  };
  const json = express.json({ limit: '1kb' });
  const findProject = (name) => typeof name === 'string' && scan().projects.find((x) => x.path.split('/').pop() === name);
  // Shared by every state-changing project endpoint: resolve project by name, optionally rate limit, run handler.
  const act = (limited, fn) => async (req, res) => {
    try {
      const name = req.body && req.body.project !== undefined ? req.body.project : req.params.name;
      const p = findProject(name);
      if (!p) return res.status(404).json({ ok: false, error: 'Project not found' });
      if (limited) {
        if (Date.now() - (lastOpen.get(req.path + name) || 0) < 2000) return res.status(429).json({ ok: false, error: 'Try again shortly' });
        lastOpen.set(req.path + name, Date.now());
      }
      const r = await fn(p, req.body || {});
      res.status(r.status ?? (r.ok ? 200 : 500)).json(r.body ?? r);
    } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e).slice(0, 200) }); }
  };
  const runKey = (b) => (typeof b.run === 'string' ? b.run : undefined);
  app.post('/api/open', guard, json, act(true, (p) => openProject({ path: p.path, spawner })));
  app.post('/api/run', guard, json, act(true, (p, b) => runs.start(p.path, runKey(b))));
  app.post('/api/stop', guard, json, act(true, (p, b) => runs.stop(p.path, runKey(b))));
  app.put('/api/port', guard, json, act(false, (p, b) => runs.setPort(p.path, runKey(b), b.port === null ? null : b.port)));
  app.get('/api/projects/:name/plugins', wrap((req) => {
    const p = findProject(req.params.name);
    if (!p) return { plugins: [], note: 'Project not found' };
    return { plugins: listPlugins(p.path, { home }), note: 'Applies to new Claude sessions; run /reload-plugins in open ones.' };
  }));
  app.put('/api/projects/:name/plugins', guard, json, act(false, (p, b) => setPlugin(p.path, b.id, b.enabled, { home })));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ ok: false, error: 'Invalid request' }));
  app.get('/api/feed', wrap((req) => feed(aggregate(scan()).projects, req.query.project)));
  app.get('/api/pipeline', wrap(async (req) => pipeline((await full()).projects, req.query.project)));
  app.get('/api/insights', wrap((req) => {
    const name = req.query.project, days = req.query.days;
    const p = typeof name === 'string' && scan().projects.find((x) => x.path.split('/').pop() === name);
    return p ? readInsights(p.path, { root, days, now }) : readInsights('', { root, days, now });
  }));
  const dist = process.env.WEB_DIST || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'dist');
  if (fs.existsSync(dist)) app.use(express.static(dist));
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 47615;
  const host = process.env.HOST || '127.0.0.1';
  const token = process.env.DASHBOARD_TOKEN;
  if (!['127.0.0.1', '::1', 'localhost'].includes(host) && (!token || token.length < 16)) {
    console.error(`HOST=${host} is exposed on the network, so DASHBOARD_TOKEN (at least 16 characters) is required. Set it in server/.env, or remove HOST.`);
    process.exit(1);
  }
  createApp().listen(port, host, () => {
    console.log(`dashboard API on http://${host}:${port}`);
    if (token) for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  http://${a.address}:${port}/?key=${token}`);
  });
}
