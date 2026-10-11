import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';
import { openProject } from '../openProject.js';

const TOKEN = 'abcdefghijklmnop1234';
const COOKIE = 'dash_auth=' + crypto.createHash('sha256').update(TOKEN).digest('hex');
const SERVER_JS = fileURLToPath(new URL('../server.js', import.meta.url));

function fakeSpawner(behave) {
  const calls = [];
  const fn = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    const c = new EventEmitter();
    c.unref = () => {};
    if (behave) setImmediate(() => behave(c));
    return c;
  };
  fn.calls = calls;
  return fn;
}
const ok = (c) => c.emit('exit', 0);

async function setup({ spawner = fakeSpawner(ok), local = true, token } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-'));
  const proj = path.join(base, 'demo');
  fs.mkdirSync(proj);
  const root = path.join(base, 'claude');
  fs.mkdirSync(path.join(root, 'p'), { recursive: true });
  fs.writeFileSync(path.join(root, 'p', 's.jsonl'), JSON.stringify({ cwd: proj, sessionId: 's', timestamp: new Date().toISOString() }));
  const state = { local };
  const server = createApp({ root, read: async () => ({ status: 'no-sheet', rows: [] }), spawner, isLocal: () => state.local, token }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(url + '/api/open', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { url, name: 'demo', proj, spawner, state, post, close: () => server.close() };
}

test('013-1 valid project runs command once with the folder only', async () => {
  const t = await setup();
  try {
    const r = await t.post({ project: t.name });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
    assert.equal(t.spawner.calls.length, 1);
    const { cmd, args } = t.spawner.calls[0];
    if (process.platform === 'win32') assert.deepEqual([cmd, args.slice(0, 4), args.length], ['cmd.exe', ['/d', '/s', '/c', 'code'], 5]);
    else assert.deepEqual([cmd, args], ['code', [t.proj]]);
  } finally { t.close(); }
});

test('013-1b windows spawn args and verbatim option', async () => {
  const sp = fakeSpawner(ok);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w-'));
  assert.deepEqual(await openProject({ path: dir, command: 'code', platform: 'win32', spawner: sp }), { ok: true });
  assert.deepEqual(sp.calls[0].args, ['/d', '/s', '/c', 'code', '"' + dir + '"']);
  assert.equal(sp.calls[0].opts.windowsVerbatimArguments, true);
});

test('013-2 body path ignored; unknown project 404', async () => {
  const t = await setup();
  try {
    assert.equal((await t.post({ project: 'nope', path: t.proj })).status, 404);
    assert.equal((await t.post({ path: t.proj })).status, 404);
    assert.equal(t.spawner.calls.length, 0);
    assert.equal((await t.post({ project: t.name, path: os.tmpdir() })).status, 200);
    assert.ok(t.spawner.calls[0].args.join(' ').toLowerCase().includes(t.proj.replaceAll('\\', '/').toLowerCase()));
    assert.ok(!t.spawner.calls[0].args.join(' ').includes(os.tmpdir() + '"'));
  } finally { t.close(); }
});

test('013-3 special chars rejected without running; missing folder message', async () => {
  const sp = fakeSpawner(ok);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'bad-'));
  for (const ch of ['&', '|', '<', '>', '^', '%', '!', '"', '\n']) {
    const r = await openProject({ path: path.join(base, 'a' + ch + 'b'), platform: 'linux', spawner: sp });
    assert.equal(r.ok, false, JSON.stringify(ch));
  }
  assert.equal(sp.calls.length, 0);
  assert.deepEqual(await openProject({ path: path.join(base, 'missing'), spawner: sp }), { ok: false, error: 'Folder not found' });
  assert.equal(sp.calls.length, 0);
});

test('013-4 non-loopback 403, foreign Origin 403, non-JSON 415', async () => {
  const t = await setup();
  try {
    t.state.local = false;
    assert.equal((await t.post({ project: t.name })).status, 403);
    t.state.local = true;
    assert.equal((await t.post({ project: t.name }, { origin: 'http://evil.example' })).status, 403);
    assert.equal((await t.post({ project: t.name }, { origin: t.url.replace('127.0.0.1', 'localhost') })).status, 200);
    const r = await fetch(t.url + '/api/open', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ project: t.name }) });
    assert.equal(r.status, 415);
    assert.equal(t.spawner.calls.length, 1);
  } finally { t.close(); }
});

test('013-5 bad EDITOR_COMMAND rejected', async () => {
  const sp = fakeSpawner(ok);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-'));
  for (const command of ['my editor', 'C:\\x\\code', '/usr/bin/code', 'code&calc', 'code;x', '$(x)', '', 'a|b']) {
    assert.deepEqual(await openProject({ path: dir, command, spawner: sp }), { ok: false, error: 'Invalid editor command' }, command);
  }
  assert.equal(sp.calls.length, 0);
});

test('013-6 spawn error -> 500; nonzero exit -> error; timeout -> success', async () => {
  const t = await setup({ spawner: fakeSpawner((c) => c.emit('error', new Error('ENOENT'))) });
  try {
    const r = await t.post({ project: t.name });
    assert.equal(r.status, 500);
    assert.match((await r.json()).error, /command not found/);
  } finally { t.close(); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ex-'));
  assert.equal((await openProject({ path: dir, platform: 'linux', spawner: fakeSpawner((c) => c.emit('exit', 1)) })).ok, false);
  const t0 = Date.now();
  assert.deepEqual(await openProject({ path: dir, platform: 'linux', spawner: fakeSpawner() }), { ok: true });
  assert.ok(Date.now() - t0 >= 2900);
});

test('013-7 second open within 2 s -> 429', async () => {
  const t = await setup();
  try {
    assert.equal((await t.post({ project: t.name })).status, 200);
    assert.equal((await t.post({ project: t.name })).status, 429);
    assert.equal(t.spawner.calls.length, 1);
  } finally { t.close(); }
});

test('013-8 canOpen true for loopback, false otherwise', async () => {
  const t = await setup();
  try {
    assert.equal((await (await fetch(t.url + '/api/projects')).json()).canOpen, true);
    t.state.local = false;
    assert.equal((await (await fetch(t.url + '/api/projects')).json()).canOpen, false);
  } finally { t.close(); }
});

test('014-1 non-loopback HOST without/with short token refuses to start', () => {
  for (const token of [undefined, 'short']) {
    const env = { ...process.env, HOST: '0.0.0.0', PORT: '0' };
    delete env.DASHBOARD_TOKEN;
    if (token) env.DASHBOARD_TOKEN = token;
    const r = spawnSync(process.execPath, [SERVER_JS], { env, encoding: 'utf8', timeout: 10000 });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /DASHBOARD_TOKEN/);
  }
});

test('014-2/6 default (no token) and loopback with token need nothing', async () => {
  const t = await setup();
  try { assert.equal((await fetch(t.url + '/api/projects')).status, 200); } finally { t.close(); }
  const t2 = await setup({ token: TOKEN, local: true });
  try { assert.equal((await fetch(t2.url + '/api/projects')).status, 200); } finally { t2.close(); }
});

test('014-3 remote without cookie/key: 401 JSON on api, Bangla page on /', async () => {
  const t = await setup({ token: TOKEN, local: false });
  try {
    const a = await fetch(t.url + '/api/projects');
    assert.equal(a.status, 401);
    assert.deepEqual(await a.json(), { error: 'token needed' });
    const p = await fetch(t.url + '/');
    assert.equal(p.status, 401);
    assert.match(await p.text(), /token is required/);
  } finally { t.close(); }
});

test('014-4 ?key= sets cookie and redirects; cookie grants access', async () => {
  const t = await setup({ token: TOKEN, local: false });
  try {
    const r = await fetch(t.url + '/?a=1&key=' + TOKEN, { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/?a=1');
    const sc = r.headers.get('set-cookie');
    assert.ok(sc.startsWith(COOKIE));
    assert.match(sc, /HttpOnly/);
    assert.match(sc, /SameSite=Strict/);
    assert.equal((await fetch(t.url + '/api/projects', { headers: { cookie: COOKIE } })).status, 200);
  } finally { t.close(); }
});

test('014-5 wrong key or cookie gets 401', async () => {
  const t = await setup({ token: TOKEN, local: false });
  try {
    for (const q of ['wrong', TOKEN.slice(0, -1)]) assert.equal((await fetch(t.url + '/api/projects?key=' + q, { redirect: 'manual' })).status, 401);
    for (const c of ['dash_auth=abc', 'dash_auth=' + 'a'.repeat(64)]) assert.equal((await fetch(t.url + '/api/projects', { headers: { cookie: c } })).status, 401);
  } finally { t.close(); }
});

test('014-7 remote POST /api/open 403 with valid cookie; canOpen false', async () => {
  const t = await setup({ token: TOKEN, local: false });
  try {
    assert.equal((await t.post({ project: t.name }, { cookie: COOKIE })).status, 403);
    assert.equal(t.spawner.calls.length, 0);
    assert.equal((await (await fetch(t.url + '/api/projects', { headers: { cookie: COOKIE } })).json()).canOpen, false);
  } finally { t.close(); }
});

function startupOutput(token) {
  const env = { ...process.env, HOST: '127.0.0.1', PORT: String(40000 + Math.floor(Math.random() * 20000)), CLAUDE_PROJECTS_DIR: os.tmpdir() };
  delete env.DASHBOARD_TOKEN;
  if (token) env.DASHBOARD_TOKEN = token;
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [SERVER_JS], { env });
    let out = '';
    c.stdout.on('data', (d) => (out += d));
    setTimeout(() => { c.kill(); resolve(out); }, 1500);
  });
}

test('014-8 startup lists ?key= URL per IPv4; no token printed without token', async () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);
  const withTok = await startupOutput(TOKEN);
  for (const ip of ips) assert.ok(new RegExp(`http://${ip.replace(/\./g, '\\.')}:\\d+/\\?key=${TOKEN}`).test(withTok), ip);
  const noTok = await startupOutput();
  assert.match(noTok, /dashboard API/);
  assert.ok(!/key=/.test(noTok));
});
