import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, feed, pipeline, resolveRequirements } from '../aggregate.js';

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
  'c:/w/live': { status: 'ok', rows: [{ ...row('1', 'Extracted'), spec: '1' }, row('2', 'Confirmed'), row('3', 'Spec Written'), row('4', 'Bogus')] },
  'c:/w/mid': { status: 'ok', rows: [row('5', 'Confirmed'), row('6', 'Rejected')] },
  'c:/w/broken': { status: 'error', rows: [], error: 'boom' },
};
const spec = (id, status) => ({ id, title: 't' + id, path: id + '.md', status });
const specs = {
  'c:/w/live': { status: 'ok', specs: [spec('1', 'built')] },
  'c:/w/old': { status: 'ok', specs: [spec('a', 'built'), spec('b', 'draft'), spec('c', 'unknown')] },
  'c:/w/broken': { status: 'ok', specs: [spec('z', 'built')] },
};
const res = aggregate(scan, sheets, specs, NOW);
const by = Object.fromEntries(res.projects.map((p) => [p.name, p]));

test('name and sort order', () => {
  assert.deepEqual(res.projects.map((p) => p.name), ['live', 'mid', 'broken', 'old']);
});

test('counts, zero for no-sheet and error', () => {
  assert.deepEqual(by.live.requirements.counts, { Extracted: 0, Confirmed: 1, 'Spec Written': 1, Built: 1, Rejected: 0 });
  assert.equal(by.broken.requirements.status, 'error');
  assert.equal(by.broken.requirements.counts.Extracted, 0);
});

test('kpis: open, built, total', () => {
  assert.equal(res.kpis.openRequirements, 4); // live: Confirmed + Spec Written; mid: Confirmed; old map: Spec Written
  assert.equal(res.kpis.built, 2); // live row 1 (via spec), old map 'a'
  assert.equal(res.kpis.totalRequirements, 6);
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
  assert.deepEqual(Object.keys(p), ['Extracted', 'Confirmed', 'Spec Written', 'Built', 'Rejected']);
  assert.deepEqual(p.Confirmed.map((r) => [r.project, r.id]), [['live', '2'], ['mid', '5']]);
  assert.equal(Object.values(p).flat().length, 5); // Bogus and MAP-based project left out
  assert.equal(pipeline(res.projects, 'nope').Confirmed.length, 0);
});

test('sheet row with built spec id becomes Built; others keep status', () => {
  const r = by.live.requirements;
  assert.equal(r.source, 'sheet');
  assert.equal(r.rows.find((x) => x.id === '1').status, 'Built'); // Sheet said Extracted
  assert.equal(r.rows.find((x) => x.id === '3').status, 'Spec Written');
});

test('no sheet + specs -> map source', () => {
  const r = by.old.requirements;
  assert.equal(r.source, 'map');
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.rows.map((x) => x.status), ['Built', 'Spec Written', 'Unknown']);
  assert.deepEqual(r.rows[0], { id: 'a', title: 'ta', summary: '', source: 'MAP', priority: '', status: 'Built', spec: 'a' });
  assert.deepEqual(r.counts, { Extracted: 0, Confirmed: 0, 'Spec Written': 1, Built: 1, Rejected: 0 });
});

test('sheet error stays error despite specs', () => {
  assert.deepEqual(by.broken.requirements, { status: 'error', source: 'none', counts: { Extracted: 0, Confirmed: 0, 'Spec Written': 0, Built: 0, Rejected: 0 }, rows: [], error: 'boom' });
});

test('no sheet and no specs -> no-sheet, none', () => {
  assert.equal(by.mid.requirements.source, 'sheet');
  const r = aggregate({ activeMinutes: 5, projects: [proj('c:/w/x', [sess('x', 1)])] }, {}, {}, NOW).projects[0].requirements;
  assert.deepEqual(r, { status: 'no-sheet', source: 'none', counts: { Extracted: 0, Confirmed: 0, 'Spec Written': 0, Built: 0, Rejected: 0 }, rows: [] });
});

test('sheetUrl copied for sheet ok and error, absent for map and no-sheet', () => {
  const u = 'https://docs.google.com/spreadsheets/d/a/edit';
  assert.equal(resolveRequirements({ status: 'ok', rows: [], sheetUrl: u }).sheetUrl, u);
  assert.equal(resolveRequirements({ status: 'error', rows: [], error: 'x', sheetUrl: u }).sheetUrl, u);
  assert.equal('sheetUrl' in resolveRequirements({ status: 'error', rows: [], error: 'invalid Sheet URL' }), false);
  assert.equal('sheetUrl' in resolveRequirements(undefined, { status: 'ok', specs: [{ id: '1', title: 't', status: 'built' }] }), false);
  assert.equal('sheetUrl' in resolveRequirements(), false);
});
