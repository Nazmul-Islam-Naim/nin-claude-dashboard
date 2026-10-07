import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, feed, pipeline } from '../aggregate.js';

const NOW = new Date(2026, 9, 5, 12, 0, 0).getTime(); // local noon
const at = (h) => new Date(NOW - h * 3600000).toISOString();
const sess = (id, h) => ({ sessionId: id, title: id, lastActivity: at(h) });
const proj = (p, list, active = false) => ({ path: p, sessions: list.length, lastActivity: list.map((s) => s.lastActivity).sort().pop(), active, sessionList: list });
const row = (id, status) => ({ id, title: id, summary: '', source: '', priority: '', status, spec: '' });

const scan = {
  activeMinutes: 5,
  projects: [
    proj('c:/w/old', [sess('o1', 48)]),
    proj('c:/w/live', [sess('l1', 1), sess('l2', 0.1)], true),
    proj('c:/w/mid', [sess('m1', 30)]),
    proj('c:/w/broken', [sess('b1', 40)]),
  ],
};
const sheets = {
  'c:/w/live': { status: 'ok', rows: [row('1', 'Extracted'), row('2', 'Confirmed'), row('3', 'Spec Written'), row('4', 'Bogus')] },
  'c:/w/mid': { status: 'ok', rows: [row('5', 'Confirmed'), row('6', 'Rejected')] },
  'c:/w/broken': { status: 'error', rows: [], error: 'boom' },
};
const res = aggregate(scan, sheets, NOW);
const by = Object.fromEntries(res.projects.map((p) => [p.name, p]));

test('name and sort order', () => {
  assert.deepEqual(res.projects.map((p) => p.name), ['live', 'mid', 'broken', 'old']);
});

test('counts, zero for no-sheet and error', () => {
  assert.deepEqual(by.live.requirements.counts, { Extracted: 1, Confirmed: 1, 'Spec Written': 1, Rejected: 0 });
  assert.deepEqual(by.old.requirements, { status: 'no-sheet', counts: { Extracted: 0, Confirmed: 0, 'Spec Written': 0, Rejected: 0 }, rows: [] });
  assert.equal(by.broken.requirements.status, 'error');
  assert.equal(by.broken.requirements.counts.Extracted, 0);
});

test('openRequirements counts Extracted + Confirmed only', () => {
  assert.equal(res.kpis.openRequirements, 3);
  assert.equal(res.kpis.activeProjects, 1);
  assert.equal(res.activeMinutes, 5);
});

test('sessionsToday uses local day of now', () => {
  assert.equal(res.kpis.sessionsToday, 2); // l1, l2 only; 30h and older are other days
});

test('error project keeps session data, others unaffected', () => {
  assert.equal(by.broken.sessions, 1);
  assert.equal(by.live.requirements.status, 'ok');
});

test('feed newest first, filtered, capped at 100', () => {
  const f = feed(res.projects);
  assert.equal(f[0].sessionId, 'l2');
  assert.deepEqual(feed(res.projects, 'mid').map((x) => x.project), ['mid']);
  assert.deepEqual(feed(res.projects, 'nope'), []);
  const many = [{ ...res.projects[0], sessionList: Array.from({ length: 150 }, (_, i) => sess('x' + i, i / 10)) }];
  assert.equal(feed(many).length, 100);
});

test('pipeline groups and tags rows', () => {
  const p = pipeline(res.projects);
  assert.deepEqual(Object.keys(p), ['Extracted', 'Confirmed', 'Spec Written', 'Rejected']);
  assert.deepEqual(p.Confirmed.map((r) => [r.project, r.id]), [['live', '2'], ['mid', '5']]);
  assert.equal(p.Extracted.length + p.Confirmed.length + p['Spec Written'].length + p.Rejected.length, 5); // Bogus left out
  assert.equal(pipeline(res.projects, 'nope').Confirmed.length, 0);
});
