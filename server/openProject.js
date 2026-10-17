import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn as realSpawn } from 'node:child_process';

const BAD_PATH = /[&|<>^%!"\r\n]/;

export async function openProject({ path: dir, command = process.env.EDITOR_COMMAND || 'code', platform = process.platform, spawner = realSpawn } = {}) {
  if (typeof command !== 'string' || !/^[A-Za-z0-9._-]+$/.test(command)) return { ok: false, error: 'Invalid editor command' };
  if (typeof dir !== 'string' || !path.isAbsolute(dir) || BAD_PATH.test(dir)) return { ok: false, error: 'Invalid path' };
  try { if (!fs.statSync(dir).isDirectory()) throw 0; } catch { return { ok: false, error: 'Folder not found' }; }
  const notFound = { ok: false, error: `${command} command not found` };
  const opts = { detached: true, stdio: 'ignore' };
  let child;
  try {
    child = platform === 'win32'
      ? spawner('cmd.exe', ['/d', '/s', '/c', command, '"' + dir + '"'], { ...opts, windowsVerbatimArguments: true, windowsHide: true })
      : spawner(command, [dir], opts);
  } catch { return notFound; }
  const result = await new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: true }), 3000);
    const done = (r) => { clearTimeout(t); resolve(r); };
    child.once('error', () => done(notFound));
    child.once('exit', (code) => done(code ? notFound : { ok: true }));
  });
  child.unref?.();
  return result;
}

// Dev-server command for one folder by project type; null when none is recognised.
function detectOne(dir) {
  const has = (f) => fs.existsSync(path.join(dir, f));
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return ''; } };
  if (has('artisan')) return 'php artisan serve';
  if (has('manage.py')) return 'python manage.py runserver';
  if (/fastapi/i.test(read('requirements.txt') + read('pyproject.toml'))) {
    const mod = has('app/main.py') ? 'app.main' : has('main.py') ? 'main' : null;
    if (mod) return `uvicorn ${mod}:app --reload`;
  }
  try {
    const s = JSON.parse(read('package.json') || '{}').scripts || {};
    const k = ['dev', 'start'].find((x) => typeof s[x] === 'string');
    if (k) return `npm run ${k}`;
  } catch {}
  return null;
}

// [{ dir, cmd }]: the root if it is a runnable project, else each runnable first-level sub-folder
// (combined projects, e.g. FastAPI api/ + Next.js web/).
export function detectRun(dir) {
  const root = detectOne(dir);
  if (root) return [{ dir, cmd: root }];
  let subs = [];
  try { subs = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !/^(\.|node_modules$|vendor$|dist$|build$|venv$|__pycache__$)/.test(e.name)); } catch {}
  return subs.flatMap((e) => { const d = path.join(dir, e.name); const cmd = detectOne(d); return cmd ? [{ dir: d, cmd }] : []; });
}

// A Python project's own venv holds uvicorn, but it is not on PATH: use it when present (the command label stays `uvicorn ...`).
export function withVenv(cmd, dir) {
  if (!cmd.startsWith('uvicorn')) return cmd;
  for (const rel of ['.venv/bin/uvicorn', 'venv/bin/uvicorn', '.venv/Scripts/uvicorn.exe', 'venv/Scripts/uvicorn.exe']) {
    const bin = path.join(dir, rel);
    if (fs.existsSync(bin)) return `"${bin}"${cmd.slice('uvicorn'.length)}`;
  }
  return cmd;
}

export const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer().unref().once('error', reject).listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});
export const withPort = (cmd, n) => cmd.startsWith('php artisan') ? `${cmd} --port=${n}` : cmd.startsWith('uvicorn') ? `${cmd} --port ${n}` : cmd.startsWith('python manage.py') ? `${cmd} ${n}` : `${cmd} -- --port ${n}`;
// Resolves once something accepts connections on the port (60 s max), else false.
export const waitPort = (port, tries = 120) => new Promise((resolve) => {
  const go = (left) => {
    const sock = net.connect({ port, host: 'localhost' }, () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); if (left <= 0) resolve(false); else setTimeout(() => go(left - 1), 500).unref(); });
  };
  go(tries);
});
