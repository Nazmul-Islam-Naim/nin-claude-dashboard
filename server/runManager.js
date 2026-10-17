import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn as realSpawn, execFile } from 'node:child_process';
import { detectRun, freePort, withPort, waitPort } from './openProject.js';

export const dataDir = () => process.env.DASHBOARD_DATA_DIR || path.join(os.homedir(), '.claude-dashboard');

const serviceKey = (projectPath, r) => `${path.relative(projectPath, r.dir) || '.'}: ${r.cmd}`;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

const killTree = (pid) => {
  if (process.platform === 'win32') return realSpawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }).unref();
  try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch {} }
};

// Free = we can bind it on all interfaces. Busy owner is looked up best effort; failure just means "external".
const probePort = (port) => new Promise((resolve) => {
  const srv = net.createServer().once('error', () => resolve(false)).listen(port, () => srv.close(() => resolve(true)));
});
const externalPid = (port) => new Promise((resolve) => {
  if (process.platform === 'win32') return resolve(undefined);
  execFile('ss', ['-ltnpH', `sport = :${port}`], { timeout: 1500 }, (err, out) => resolve(err ? undefined : Number((String(out).match(/pid=(\d+)/) || [])[1]) || undefined));
});

// Does the process listening on `port` belong to the process group started as `pid`? undefined = cannot tell.
const ownsPort = (pid, port) => new Promise((resolve) => {
  if (process.platform === 'win32') return resolve(undefined);
  execFile('ss', ['-ltnpH', `sport = :${port}`], { timeout: 1500 }, (err, out) => {
    const listener = err ? 0 : Number((String(out).match(/pid=(\d+)/) || [])[1]);
    if (!listener) return resolve(undefined);
    execFile('ps', ['-o', 'pgid=', '-p', String(listener)], { timeout: 1500 }, (e, o) => resolve(e || !Number(o) ? undefined : Number(o) === pid));
  });
});

const defaultOpener = (url) => {
  const [cmd, args] = process.platform === 'win32' ? ['cmd.exe', ['/d', '/c', 'start', '""', url]] : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  const c = realSpawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
  c.once('error', () => {});
  c.unref();
};

export function createRunManager({ dir = dataDir(), spawner = realSpawn, probe = probePort, owner = externalPid, ownsPortFn = ownsPort, isAlive = alive, kill = killTree, wait = waitPort, opener = defaultOpener } = {}) {
  const running = new Map(); // `${projectPath}\0${key}` -> { pid, port, cmd, startedAt }
  const portsFile = path.join(dir, 'ports.json');
  const readPorts = () => { try { return JSON.parse(fs.readFileSync(portsFile, 'utf8')) || {}; } catch (e) { if (e.code === 'ENOENT') return {}; throw new Error('ports.json unreadable'); } };
  const writePorts = (obj) => {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${portsFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`);
    fs.renameSync(tmp, portsFile);
  };
  const runsFile = path.join(dir, 'runs.json');
  const id = (p, key) => `${p}\0${key}`;
  const saveRuns = () => {
    const out = {};
    for (const [k, r] of running) { const [p, key] = k.split('\0'); (out[p] ||= {})[key] = r; }
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = `${runsFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(out, null, 2)}\n`);
      fs.renameSync(tmp, runsFile);
    } catch {}
  };
  const forget = (p, key) => { running.delete(id(p, key)); saveRuns(); };
  const live = (p, key) => { const r = running.get(id(p, key)); if (r && !isAlive(r.pid)) { forget(p, key); return undefined; } return r; };

  // Re-adopt services started before a dashboard restart. A record counts only if its pid is alive and its port
  // is still bound by that process group (guards against a reused pid); the port check is async, so stale entries drop shortly after startup.
  try {
    for (const [p, svc] of Object.entries(JSON.parse(fs.readFileSync(runsFile, 'utf8')) || {})) {
      for (const [key, r] of Object.entries(svc)) if (isAlive(r.pid)) running.set(id(p, key), r);
    }
  } catch {}
  for (const [k, r] of [...running]) {
    (async () => (await probe(r.port)) || (await ownsPortFn(r.pid, r.port)) === false)()
      .then((stale) => { if (stale && running.get(k) === r) { running.delete(k); saveRuns(); } }).catch(() => {});
  }
  const trackedOn = (port) => { for (const [k, r] of running) if (r.port === port && isAlive(r.pid)) return { project: k.split('\0')[0].split('/').pop() }; return undefined; };
  const registryOwner = (ports, port, exceptPath) => { for (const [p, svc] of Object.entries(ports)) if (p !== exceptPath && Object.values(svc).includes(port)) return { project: p.split('/').pop() }; return undefined; };
  const pick = (projectPath, key) => { const runs = detectRun(projectPath); return key ? runs.find((r) => serviceKey(projectPath, r) === key) : runs[0]; };

  return {
    services(projectPath) {
      const ports = readPorts()[projectPath] || {};
      return detectRun(projectPath).map((r) => {
        const key = serviceKey(projectPath, r), rec = live(projectPath, key);
        return { key, cmd: r.cmd, port: rec ? rec.port : (ports[key] ?? null), state: rec ? 'running' : 'stopped', ...(rec && { pid: rec.pid }) };
      });
    },
    setPort(projectPath, key, port) {
      if (!pick(projectPath, key)) return { status: 404, body: { ok: false, error: 'Service not found' } };
      const ports = readPorts();
      if (port === null) { if (ports[projectPath]) { delete ports[projectPath][key]; if (!Object.keys(ports[projectPath]).length) delete ports[projectPath]; writePorts(ports); } return { status: 200, body: { ok: true } }; }
      if (!Number.isInteger(port) || port < 1024 || port > 65535) return { status: 400, body: { ok: false, error: 'Port must be 1024-65535' } };
      const other = registryOwner(ports, port, projectPath);
      if (other) return { status: 409, body: { ok: false, error: 'port-taken', owner: other } };
      ports[projectPath] = { ...ports[projectPath], [key]: port };
      writePorts(ports);
      return { status: 200, body: { ok: true } };
    },
    async start(projectPath, key) {
      const r = pick(projectPath, key);
      if (!r) return { status: 404, body: { ok: false, error: 'No runnable project type found' } };
      const k = serviceKey(projectPath, r);
      if (live(projectPath, k)) return { status: 409, body: { ok: false, error: 'already-running' } };
      const saved = readPorts()[projectPath]?.[k];
      const port = saved ?? await freePort();
      if (saved !== undefined) {
        const mine = trackedOn(port);
        if (mine || !(await probe(port))) return { status: 409, body: { ok: false, error: 'port-busy', port, owner: mine || { external: true, pid: await owner(port) } } };
      }
      fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
      const log = fs.openSync(path.join(dir, 'logs', `${path.basename(projectPath)}-${path.basename(r.dir)}.log`), 'a');
      let child;
      try {
        child = spawner(withPort(r.cmd, port), [], { cwd: r.dir, shell: true, detached: true, windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env, PORT: String(port) } });
      } finally { fs.closeSync(log); }
      child.once?.('error', () => forget(projectPath, k));
      child.unref?.();
      if (!child.pid) return { status: 500, body: { ok: false, error: 'Could not start' } };
      running.set(id(projectPath, k), { pid: child.pid, port, cmd: r.cmd, startedAt: Date.now() });
      saveRuns();
      if (r.cmd.startsWith('npm') || runningFirst(projectPath, running, id)) wait(port).then((up) => up && opener(`http://localhost:${port}`)).catch(() => {});
      return { status: 200, body: { ok: true, port } };
    },
    // No key = stop every running service of the project.
    stop(projectPath, key) {
      const keys = (key ? [key] : detectRun(projectPath).map((x) => serviceKey(projectPath, x))).filter((x) => live(projectPath, x));
      if (!keys.length) return { status: 404, body: { ok: false, error: 'Not running' } };
      for (const k of keys) { kill(running.get(id(projectPath, k)).pid); running.delete(id(projectPath, k)); }
      saveRuns();
      return { status: 200, body: { ok: true } };
    },
  };
}

// Open the browser for a non-npm service only when nothing else of this project is running yet.
const runningFirst = (projectPath, running, id) => [...running.keys()].filter((k) => k.startsWith(`${projectPath}\0`)).length === 1;
