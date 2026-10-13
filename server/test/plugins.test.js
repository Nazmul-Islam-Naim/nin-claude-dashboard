import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listPlugins, setPlugin } from '../pluginsReader.js';
import { createApp } from '../server.js';

function world() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-'));
  const home = path.join(base, 'home'), proj = path.join(base, 'demo');
  fs.mkdirSync(path.join(proj, '.claude'), { recursive: true });
  const install = (name, desc) => {
    const ip = path.join(home, 'plugins', 'cache', name);
    fs.mkdirSync(path.join(ip, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(path.join(ip, '.claude-plugin', 'plugin.json'), JSON.stringify({ name, description: desc }));
    return { scope: 'user', installPath: ip, version: '1.0.0' };
  };
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'alpha@mp': [install('alpha', 'A plugin')], 'beta@mp': [install('beta', 'B plugin')], 'gone@mp': [{ installPath: path.join(base, 'missing') }] } }));
  fs.writeFileSync(path.join(home, 'settings.json'), JSON.stringify({ enabledPlugins: { 'alpha@mp': true, 'beta@mp': true }, env: { SECRET: 'x' } }));
  return { base, home, proj, local: path.join(proj, '.claude', 'settings.local.json') };
}

test('022-1 merge precedence user < project < local; missing install skipped; stale key flagged', () => {
  const w = world();
  fs.writeFileSync(path.join(w.proj, '.claude', 'settings.json'), JSON.stringify({ enabledPlugins: { 'beta@mp': false, 'stale@mp': true } }));
  fs.writeFileSync(w.local, JSON.stringify({ enabledPlugins: { 'alpha@mp': false, 'beta@mp': true } }));
  const list = listPlugins(w.proj, { home: w.home });
  const by = Object.fromEntries(list.map((p) => [p.id, p]));
  assert.deepEqual([by['alpha@mp'].enabled, by['alpha@mp'].source], [false, 'local']);
  assert.deepEqual([by['beta@mp'].enabled, by['beta@mp'].source], [true, 'local']);
  assert.equal(by['alpha@mp'].description, 'A plugin');
  assert.equal(by['gone@mp'], undefined);
  assert.deepEqual([by['stale@mp'].installed, by['stale@mp'].enabled], [false, true]);
});

test('022-2 toggle writes only enabledPlugins[id], keeps other keys', () => {
  const w = world();
  fs.writeFileSync(w.local, JSON.stringify({ permissions: { allow: ['x'] }, enabledPlugins: { 'beta@mp': true } }));
  const r = setPlugin(w.proj, 'alpha@mp', false, { home: w.home });
  assert.equal(r.status, 200);
  const data = JSON.parse(fs.readFileSync(w.local, 'utf8'));
  assert.deepEqual(data, { permissions: { allow: ['x'] }, enabledPlugins: { 'beta@mp': true, 'alpha@mp': false } });
  assert.ok(fs.readFileSync(w.local, 'utf8').endsWith('}\n'));
});

test('022-2b creates file and .claude dir when missing', () => {
  const w = world();
  fs.rmSync(path.join(w.proj, '.claude'), { recursive: true });
  assert.equal(setPlugin(w.proj, 'alpha@mp', false, { home: w.home }).status, 200);
  assert.deepEqual(JSON.parse(fs.readFileSync(w.local, 'utf8')), { enabledPlugins: { 'alpha@mp': false } });
});

test('022-3 invalid JSON: 422 and file unchanged', () => {
  const w = world();
  fs.writeFileSync(w.local, '{ "a": 1, // comment\n}');
  const before = fs.readFileSync(w.local, 'utf8');
  assert.equal(setPlugin(w.proj, 'alpha@mp', false, { home: w.home }).status, 422);
  assert.equal(fs.readFileSync(w.local, 'utf8'), before);
});

test('022-4 unknown id and bad body: 400', () => {
  const w = world();
  assert.equal(setPlugin(w.proj, 'nope@mp', true, { home: w.home }).status, 400);
  assert.equal(setPlugin(w.proj, 'alpha@mp', 'yes', { home: w.home }).status, 400);
  assert.equal(fs.existsSync(w.local), false);
});

test('022-5 routes: GET lists without settings content, PUT guarded', async () => {
  const w = world();
  const root = path.join(w.base, 'claude');
  fs.mkdirSync(path.join(root, 'p'), { recursive: true });
  fs.writeFileSync(path.join(root, 'p', 's.jsonl'), JSON.stringify({ cwd: w.proj, sessionId: 's', timestamp: new Date().toISOString() }));
  const state = { local: true };
  const server = createApp({ root, read: async () => ({ status: 'no-sheet', rows: [] }), isLocal: () => state.local, claudeHome: w.home }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}/api/projects/demo/plugins`;
  const put = (body, headers = {}) => fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    const text = await (await fetch(url)).text();
    assert.ok(!text.includes('SECRET'));
    assert.equal(JSON.parse(text).plugins.length, 2);
    assert.equal((await put({ id: 'alpha@mp', enabled: false })).status, 200);
    assert.equal(JSON.parse(await (await fetch(url)).text()).plugins.find((p) => p.id === 'alpha@mp').enabled, false);
    assert.equal((await put({ id: 'alpha@mp', enabled: true }, { origin: 'http://evil.test' })).status, 403);
    assert.equal((await fetch(url, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415);
    state.local = false;
    assert.equal((await put({ id: 'alpha@mp', enabled: true })).status, 403);
  } finally { server.close(); }
});
