import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readInsights, stats } from '../insightsReader.js';
import { createApp } from '../server.js';

const NOW = Date.parse('2026-10-07T00:00:00Z');
const SECRET = 'TOP-SECRET-MESSAGE-TEXT';
const CWD = '/w/demo';
const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ins-'));
const a = (id, o = {}) => JSON.stringify({ type: 'assistant', cwd: CWD, timestamp: '2026-10-06T00:00:00Z', message: { id, model: 'm1', usage: { output_tokens: 10 }, content: [{ type: 'text', text: SECRET }] }, ...o });
const am = (id, over, o = {}) => a(id, { ...o, message: { id, model: 'm1', usage: { output_tokens: 10 }, ...over } });
function put(root, rel, lines) {
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, lines.join('\n') + '\n');
  return f;
}
const run = (root, o = {}) => readInsights(CWD, { root, now: NOW, ...o });

test('1 one id counts once, max output tokens', () => {
  const r = mk();
  put(r, 'p/s.jsonl', [am('x', { usage: { output_tokens: 5 } }), am('x', { usage: { output_tokens: 50 } }), am('x', { usage: { output_tokens: 7 } })]);
  const j = run(r);
  assert.equal(j.totals.responses, 1);
  assert.equal(j.totals.outputTokens, 50);
});

test('2 model percent, synthetic ignored', () => {
  const r = mk();
  put(r, 'p/s.jsonl', [am('1', { model: 'a' }), am('2', { model: 'a' }), am('3', { model: 'b' }), am('4', { model: '<synthetic>' }), am('5', { model: '' })]);
  const j = run(r);
  assert.equal(j.totals.responses, 3);
  assert.deepEqual(j.models.map((m) => [m.model, m.percent]), [['a', 66.7], ['b', 33.3]]);
});

test('3 plugin attribution', () => {
  const r = mk();
  put(r, 'p/s.jsonl', [a('1', { attributionPlugin: 'pl' }), a('2', { attributionSkill: 'q:s' }), a('3', { attributionSkill: 'plain' }), a('4')]);
  const j = run(r);
  assert.deepEqual(j.plugins.map((p) => [p.plugin, p.responses]).sort((x, y) => String(x[0]).localeCompare(String(y[0]))), [[null, 2], ['pl', 1], ['q', 1]]);
  assert.equal(j.skills.find((s) => s.skill === 'q:s').plugin, 'q');
  assert.equal(j.skills.find((s) => s.skill === 'plain').plugin, null);
});

test('4 skills top 10 sorted, with plugin; skill from any line of id', () => {
  const r = mk();
  const lines = [];
  for (let i = 0; i < 12; i++) for (let k = 0; k <= i; k++) lines.push(a(`s${i}-${k}`, { attributionSkill: `p:k${i}` }));
  lines.push(am('late', {}, {}), a('late', { attributionSkill: 'p:k0' }));
  put(r, 'p/s.jsonl', lines);
  const j = run(r);
  assert.equal(j.skills.length, 10);
  assert.equal(j.skills[0].skill, 'p:k11');
  assert.equal(j.skills[0].plugin, 'p');
  assert.ok(j.skills.every((s, i, arr) => !i || arr[i - 1].responses >= s.responses));
});

test('5 sidechain-only file included, same id in two files once', () => {
  const r = mk();
  put(r, 'p/main.jsonl', [a('m1'), a('dup')]);
  put(r, 'p/main/subagents/agent.jsonl', [a('sub', { isSidechain: true }), a('dup', { isSidechain: true })]);
  assert.equal(run(r).totals.responses, 3);
});

test('6 days filter and unsupported value', () => {
  const r = mk();
  put(r, 'p/s.jsonl', [a('new', { timestamp: '2026-10-05T00:00:00Z' }), a('old', { timestamp: '2026-09-01T00:00:00Z' }), a('mid', { timestamp: '2026-09-25T00:00:00Z' })]);
  assert.equal(run(r, { days: 7 }).totals.responses, 1);
  assert.equal(run(r, { days: 7 }).days, 7);
  assert.equal(run(r, { days: 30 }).totals.responses, 2);
  const all = run(r, { days: 5 });
  assert.equal(all.totals.responses, 3);
  assert.equal(all.days, null);
});

test('7 malformed or truncated line skipped', () => {
  const r = mk();
  put(r, 'p/s.jsonl', [a('1'), '{not json', 'null', a('2').slice(0, 40)]);
  assert.equal(run(r).totals.responses, 1);
});

test('8 cache by path, mtime, size', () => {
  const r = mk();
  const f = put(r, 'p/s.jsonl', [a('1')]);
  const t = new Date('2026-10-01T00:00:00Z');
  fs.utimesSync(f, t, t);
  run(r);
  const n = stats.parsed;
  run(r);
  assert.equal(stats.parsed, n);
  fs.appendFileSync(f, a('2') + '\n');
  fs.utimesSync(f, t, t); // same mtime, size changed
  assert.equal(run(r).totals.responses, 2);
  assert.equal(stats.parsed, n + 1);
  const t2 = new Date('2026-10-02T00:00:00Z');
  fs.utimesSync(f, t2, t2); // mtime only
  run(r);
  assert.equal(stats.parsed, n + 2);
});

test('9 unknown project or empty transcripts -> none', () => {
  const r = mk();
  put(r, 'p/s.jsonl', [JSON.stringify({ cwd: CWD, type: 'user' })]);
  const none = { status: 'none', days: null, totals: { responses: 0, outputTokens: 0 }, models: [], plugins: [], skills: [] };
  assert.deepEqual(run(r), none);
  assert.deepEqual(readInsights('/w/other', { root: r, now: NOW }), none);
});

test('10 no message text in output', () => {
  const r = mk();
  put(r, 'p/s.jsonl', [a('1', { attributionSkill: 'p:s' })]);
  assert.ok(!JSON.stringify(run(r)).includes(SECRET));
});

test('endpoint: unknown project -> 200 none; path param ignored; known project ok', async () => {
  const r = mk();
  put(r, 'p/s.jsonl', [a('1')]);
  const server = createApp({ root: r, now: NOW, isLocal: () => true }).listen(0, '127.0.0.1');
  await new Promise((x) => server.once('listening', x));
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/insights`;
    const bad = await fetch(`${base}?project=nope&path=${encodeURIComponent(r)}`);
    assert.equal(bad.status, 200);
    assert.equal((await bad.json()).status, 'none');
    const viaPath = await (await fetch(`${base}?path=/w/demo`)).json();
    assert.equal(viaPath.status, 'none');
    const ok = await (await fetch(`${base}?project=demo&days=7`)).json();
    assert.equal(ok.status, 'ok');
    assert.equal(ok.totals.responses, 1);
    assert.ok(!JSON.stringify(ok).includes(SECRET));
  } finally { server.close(); }
});

test('endpoint: behind auth middleware', async () => {
  const r = mk();
  const server = createApp({ root: r, isLocal: () => false, token: 'x'.repeat(20) }).listen(0, '127.0.0.1');
  await new Promise((x) => server.once('listening', x));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/insights?project=demo`);
    assert.ok(res.status === 401 || res.status === 403);
  } finally { server.close(); }
});
