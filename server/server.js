import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { scanSessions } from './scanner.js';
import { readRequirements } from './sheetReader.js';
import { aggregate, feed, pipeline } from './aggregate.js';

export function createApp({ root = process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects'), read = readRequirements } = {}) {
  const app = express();
  let cached = { at: 0, scan: null };
  const scan = () => {
    if (Date.now() - cached.at > 2000) cached = { at: Date.now(), scan: scanSessions({ root }) };
    return cached.scan;
  };
  const full = async () => {
    const s = scan();
    const entries = await Promise.all(s.projects.map(async (p) => [p.path, await read(p.path)]));
    return aggregate(s, Object.fromEntries(entries));
  };
  const wrap = (fn) => async (req, res) => {
    try { res.json(await fn(req)); } catch (e) { res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
  };
  app.get('/api/projects', wrap(full));
  app.get('/api/feed', wrap((req) => feed(aggregate(scan()).projects, req.query.project)));
  app.get('/api/pipeline', wrap(async (req) => pipeline((await full()).projects, req.query.project)));
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'dist');
  if (fs.existsSync(dist)) app.use(express.static(dist));
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4000;
  createApp().listen(port, '127.0.0.1', () => console.log(`dashboard API on http://127.0.0.1:${port}`));
}
