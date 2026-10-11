import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn as realSpawn } from 'node:child_process';

const BAD_PATH = /[&|<>^%!"\r\n]/;

export async function openProject({ path: dir, command = process.env.EDITOR_COMMAND || 'code', platform = process.platform, spawner = realSpawn } = {}) {
  if (typeof command !== 'string' || !/^[A-Za-z0-9._-]+$/.test(command)) return { ok: false, error: 'অবৈধ editor কমান্ড' };
  if (typeof dir !== 'string' || !path.isAbsolute(dir) || BAD_PATH.test(dir)) return { ok: false, error: 'অবৈধ পথ' };
  try { if (!fs.statSync(dir).isDirectory()) throw 0; } catch { return { ok: false, error: 'folder পাওয়া যায়নি' }; }
  const notFound = { ok: false, error: `${command} কমান্ড পাওয়া যায়নি` };
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

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer().unref().once('error', reject).listen(0, () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});
const withPort = (cmd, n) => cmd.startsWith('php artisan') ? `${cmd} --port=${n}` : cmd.startsWith('uvicorn') ? `${cmd} --port ${n}` : cmd.startsWith('python manage.py') ? `${cmd} ${n}` : `${cmd} -- --port ${n}`;
// Resolves once something accepts connections on the port (60 s max), else false.
const waitPort = (port, tries = 120) => new Promise((resolve) => {
  const go = (left) => {
    const sock = net.connect({ port, host: 'localhost' }, () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); if (left <= 0) resolve(false); else setTimeout(() => go(left - 1), 500).unref(); });
  };
  go(tries);
});

// Starts each detected dev server in its own terminal window on a free port (Windows),
// then opens the browser on the frontend (the npm one, else the first) once it listens.
export async function runProject({ path: dir, platform = process.platform, spawner = realSpawn, opener = (url) => realSpawn('cmd.exe', ['/d', '/c', 'start', '""', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref() } = {}) {
  if (typeof dir !== 'string' || !path.isAbsolute(dir) || BAD_PATH.test(dir)) return { ok: false, error: 'অবৈধ পথ' };
  const runs = detectRun(dir);
  if (!runs.length) return { ok: false, error: 'চালানোর মতো project type পাওয়া যায়নি' };
  if (platform !== 'win32') return { ok: false, error: 'শুধু Windows-এ সমর্থিত' }; // ponytail: add terminal launchers for mac/linux if needed
  try {
    const started = [];
    for (const r of runs) {
      const port = await freePort();
      spawner('cmd.exe', ['/d', '/s', '/c', `start "${path.basename(r.dir)}" /D "${r.dir}" cmd /k ${withPort(r.cmd, port)}`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true, windowsHide: true, env: { ...process.env, PORT: String(port) } }).unref?.();
      started.push({ port, web: r.cmd.startsWith('npm') });
    }
    const target = started.find((x) => x.web) || started[0];
    waitPort(target.port).then((up) => up && opener(`http://localhost:${target.port}`)).catch(() => {});
  } catch { return { ok: false, error: 'চালু করা যায়নি' }; }
  return { ok: true };
}
