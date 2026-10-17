import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRunManager } from '../runManager.js';
import { createApp } from '../server.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pr-'));
function project(base, name) {
  const dir = path.join(base, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'x' } }));
  return dir;
}
function fakeSpawner() {
  let pid = 1000;
  const calls = [];
  const fn = (cmd, args, opts) => { const c = new EventEmitter(); c.unref = () => {}; c.pid = ++pid; calls.push({ cmd, opts }); return c; };
  fn.calls = calls;
  return fn;
}
function manager(over = {}) {
  const dir = tmp(), killed = [], spawner = fakeSpawner(), alive = new Set();
  const spawnTracked = (cmd, a, o) => { const c = spawner(cmd, a, o); alive.add(c.pid); return c; };
  spawnTracked.calls = spawner.calls;
  const m = createRunManager({ dir, spawner: spawnTracked, probe: async () => true, owner: async () => undefined, isAlive: (p) => alive.has(p), kill: (p) => { killed.push(p); alive.delete(p); }, wait: async () => false, opener: () => {}, ...over });
  return { m, dir, killed, spawner };
}
const KEY = '.: npm run dev';

test('021-1 saved port is used and PORT env set', async () => {
  const { m, spawner } = manager();
  const p = project(tmp(), 'a');
  assert.equal(m.setPort(p, KEY, 3000).status, 200);
  const r = await m.start(p, KEY);
  assert.deepEqual([r.status, r.body.port], [200, 3000]);
  assert.equal(spawner.calls[0].opts.env.PORT, '3000');
  assert.match(spawner.calls[0].cmd, /--port 3000/);
  assert.equal(m.services(p)[0].state, 'running');
});

test('021-2 busy port blocks with external owner', async () => {
  const { m, spawner } = manager({ probe: async () => false, owner: async () => 4242 });
  const p = project(tmp(), 'a');
  m.setPort(p, KEY, 3000);
  const r = await m.start(p, KEY);
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { ok: false, error: 'port-busy', port: 3000, owner: { external: true, pid: 4242 } });
  assert.equal(spawner.calls.length, 0);
});

test('021-3 another project holding the port is named; duplicate save rejected', async () => {
  const { m } = manager();
  const base = tmp(), a = project(base, 'a'), b = project(base, 'b');
  m.setPort(a, KEY, 3000);
  const r = m.setPort(b, KEY, 3000);
  assert.deepEqual([r.status, r.body.error, r.body.owner], [409, 'port-taken', { project: 'a' }]);
});

test('021-4 stop kills tracked pid; second stop is 404', async () => {
  const { m, killed } = manager();
  const p = project(tmp(), 'a');
  await m.start(p, KEY);
  const pid = m.services(p)[0].pid;
  assert.equal(m.stop(p, KEY).status, 200);
  assert.deepEqual(killed, [pid]);
  assert.equal(m.services(p)[0].state, 'stopped');
  assert.equal(m.stop(p, KEY).status, 404);
});

test('021-4b starting a running service is 409 already-running', async () => {
  const { m } = manager();
  const p = project(tmp(), 'a');
  await m.start(p, KEY);
  assert.equal((await m.start(p, KEY)).body.error, 'already-running');
});

test('021-5 port validation and clear', () => {
  const { m } = manager();
  const p = project(tmp(), 'a');
  for (const bad of [80, 70000, 3000.5, '3000']) assert.equal(m.setPort(p, KEY, bad).status, 400);
  assert.equal(m.setPort(p, 'nope', 3000).status, 404);
  m.setPort(p, KEY, 3000);
  assert.equal(m.services(p)[0].port, 3000);
  m.setPort(p, KEY, null);
  assert.equal(m.services(p)[0].port, null);
});

test('021-6 routes: guard, services in /api/projects, port save, run, stop', async () => {
  const base = tmp(), proj = project(base, 'demo'), root = path.join(base, 'claude');
  fs.mkdirSync(path.join(root, 'p'), { recursive: true });
  fs.writeFileSync(path.join(root, 'p', 's.jsonl'), JSON.stringify({ cwd: proj, sessionId: 's', timestamp: new Date().toISOString() }));
  const { m } = manager();
  const state = { local: true };
  const server = createApp({ root, read: async () => ({ status: 'no-sheet', rows: [] }), isLocal: () => state.local, runs: m }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const call = (method, p, body, headers = {}) => fetch(url + p, { method, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await call('PUT', '/api/port', { project: 'demo', run: KEY, port: 3100 })).status, 200);
    let d = await (await fetch(url + '/api/projects')).json();
    assert.deepEqual(d.projects[0].services, [{ key: KEY, cmd: 'npm run dev', port: 3100, state: 'stopped' }]);
    assert.deepEqual(d.projects[0].run, [KEY]);
    assert.deepEqual(await (await call('POST', '/api/run', { project: 'demo' })).json(), { ok: true, port: 3100 });
    d = await (await fetch(url + '/api/projects')).json();
    assert.equal(d.projects[0].services[0].state, 'running');
    assert.equal((await call('POST', '/api/stop', { project: 'demo' })).status, 200);
    assert.equal((await call('PUT', '/api/port', { project: 'nope', run: KEY, port: 3100 })).status, 404);
    assert.equal((await call('PUT', '/api/port', { project: 'demo', run: KEY, port: 3100 }, { origin: 'http://evil.test' })).status, 403);
    assert.equal((await fetch(url + '/api/port', { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415);
    state.local = false;
    assert.equal((await call('POST', '/api/stop', { project: 'demo' })).status, 403);
    d = await (await fetch(url + '/api/projects')).json();
    assert.deepEqual(d.projects[0].services, []);
  } finally { server.close(); }
});

test('021-3b start on a port held by a running dashboard service names that project', async () => {
  const { m, dir } = manager();
  const base = tmp(), a = project(base, 'a'), b = project(base, 'b');
  m.setPort(a, KEY, 3000);
  await m.start(a, KEY);
  fs.writeFileSync(path.join(dir, 'ports.json'), JSON.stringify({ [a]: { [KEY]: 3000 }, [b]: { [KEY]: 3000 } }));
  const r = await m.start(b, KEY);
  assert.deepEqual([r.status, r.body.error, r.body.owner], [409, 'port-busy', { project: 'a' }]);
});

test('022-1 running services survive a dashboard restart and can be stopped', async () => {
  const { m, dir, killed } = manager();
  const p = project(tmp(), 'a');
  const r = await m.start(p, KEY);
  assert.equal(r.status, 200);
  const pid = m.services(p)[0].pid;
  const m2 = createRunManager({ dir, spawner: fakeSpawner(), probe: async () => false, owner: async () => undefined, isAlive: (x) => x === pid, kill: (x) => killed.push(x), wait: async () => false, opener: () => {} });
  await new Promise((res) => setImmediate(res));
  assert.deepEqual([m2.services(p)[0].state, m2.services(p)[0].pid], ['running', pid]);
  assert.equal(m2.stop(p, KEY).status, 200);
  assert.deepEqual(killed, [pid]);
  assert.equal(m2.services(p)[0].state, 'stopped');
});

test('022-2 stale record is dropped when pid is dead or port is free', async () => {
  const { m, dir } = manager();
  const p = project(tmp(), 'a');
  await m.start(p, KEY);
  const pid = m.services(p)[0].pid;
  const dead = createRunManager({ dir, spawner: fakeSpawner(), probe: async () => false, isAlive: () => false });
  assert.equal(dead.services(p)[0].state, 'stopped');
  const freed = createRunManager({ dir, spawner: fakeSpawner(), probe: async () => true, isAlive: (x) => x === pid });
  await new Promise((res) => setImmediate(res));
  assert.equal(freed.services(p)[0].state, 'stopped');
});

test('022-3 record dropped when the port listener belongs to another process group', async () => {
  const { m, dir } = manager();
  const p = project(tmp(), 'a');
  await m.start(p, KEY);
  const pid = m.services(p)[0].pid;
  const adopt = (ownsPortFn) => createRunManager({ dir, spawner: fakeSpawner(), probe: async () => false, ownsPortFn, isAlive: (x) => x === pid });
  const foreign = adopt(async () => false);
  await new Promise((res) => setImmediate(res));
  assert.equal(foreign.services(p)[0].state, 'stopped');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'runs.json'), 'utf8'))[p], undefined);
});

test('022-4 record kept when ownership matches or cannot be determined', async () => {
  for (const verdict of [true, undefined]) {
    const { m, dir } = manager();
    const p = project(tmp(), 'a');
    await m.start(p, KEY);
    const pid = m.services(p)[0].pid;
    const kept = createRunManager({ dir, spawner: fakeSpawner(), probe: async () => false, ownsPortFn: async () => verdict, isAlive: (x) => x === pid });
    await new Promise((res) => setImmediate(res));
    assert.equal(kept.services(p)[0].state, 'running');
  }
});

test('uvicorn uses the project venv binary when present', async () => {
  const { m, spawner } = manager();
  const p = path.join(tmp(), 'py');
  fs.mkdirSync(path.join(p, 'app'), { recursive: true });
  fs.mkdirSync(path.join(p, '.venv', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(p, 'requirements.txt'), 'fastapi\n');
  fs.writeFileSync(path.join(p, 'app', 'main.py'), '');
  fs.writeFileSync(path.join(p, '.venv', 'bin', 'uvicorn'), '');
  const r = await m.start(p);
  assert.equal(r.status, 200);
  assert.equal(spawner.calls[0].cmd, `"${path.join(p, '.venv', 'bin', 'uvicorn')}" app.main:app --reload --port ${r.body.port}`);
});

test('uvicorn stays bare without a venv', async () => {
  const { m, spawner } = manager();
  const p = path.join(tmp(), 'py2');
  fs.mkdirSync(path.join(p, 'app'), { recursive: true });
  fs.writeFileSync(path.join(p, 'requirements.txt'), 'fastapi\n');
  fs.writeFileSync(path.join(p, 'app', 'main.py'), '');
  await m.start(p);
  assert.match(spawner.calls[0].cmd, /^uvicorn app\.main:app --reload --port \d+$/);
});
