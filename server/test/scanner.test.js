import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanSessions } from '../scanner.js';

const NOW = Date.parse('2026-10-05T12:00:00Z');
const iso = (minAgo) => new Date(NOW - minAgo * 60000).toISOString();
const line = (o) => JSON.stringify(o);

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-'));
  for (const [rel, lines] of Object.entries(files)) {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, lines.join('\n'));
  }
  return root;
}

test('two sessions in one project', () => {
  const root = fixture({
    'a/s1.jsonl': [line({ cwd: 'C:\\w\\p', sessionId: 's1', timestamp: iso(60) })],
    'a/s2.jsonl': [line({ cwd: 'C:\\w\\p', sessionId: 's2', timestamp: iso(30) })],
  });
  const r = scanSessions({ root, now: NOW });
  assert.equal(r.projects.length, 1);
  assert.equal(r.projects[0].sessions, 2);
  assert.equal(r.projects[0].lastActivity, iso(30));
});

test('line without cwd before first cwd line', () => {
  const root = fixture({ 'a/s.jsonl': [line({ timestamp: iso(5), sessionId: 's' }), line({ cwd: '/x/y', timestamp: iso(4), sessionId: 's' })] });
  assert.equal(scanSessions({ root, now: NOW }).projects[0].path, '/x/y');
});

test('malformed and truncated lines skipped, file counts', () => {
  const root = fixture({ 'a/s.jsonl': ['not json', line({ cwd: '/x/y', timestamp: iso(1), sessionId: 's' }), '{"cwd": "/x/y", "timest'] });
  assert.equal(scanSessions({ root, now: NOW }).projects[0].sessions, 1);
});

test('sidechain-only file not counted', () => {
  const root = fixture({ 'a/s.jsonl': [line({ cwd: '/x/y', timestamp: iso(1), isSidechain: true, sessionId: 's' })] });
  assert.deepEqual(scanSessions({ root, now: NOW }).projects, []);
});

test('active threshold', () => {
  const root = fixture({ 'a/s.jsonl': [line({ cwd: '/x/y', timestamp: iso(3), sessionId: 's' })], 'b/t.jsonl': [line({ cwd: '/x/z', timestamp: iso(10), sessionId: 't' })] });
  const p = Object.fromEntries(scanSessions({ root, now: NOW }).projects.map((x) => [x.path, x]));
  assert.equal(p['/x/y'].active, true);
  assert.equal(p['/x/z'].active, false);
});

test('slash style and drive-letter case merge', () => {
  const root = fixture({
    'a/s1.jsonl': [line({ cwd: 'F:\\naim\\app', timestamp: iso(2), sessionId: '1' })],
    'b/s2.jsonl': [line({ cwd: 'f:/naim/app/', timestamp: iso(3), sessionId: '2' })],
  });
  const r = scanSessions({ root, now: NOW });
  assert.equal(r.projects.length, 1);
  assert.equal(r.projects[0].path, 'f:/naim/app');
  assert.equal(r.projects[0].sessions, 2);
});

test('empty or missing root, activeMinutes echoed', () => {
  assert.deepEqual(scanSessions({ root: path.join(os.tmpdir(), 'nope-' + Date.now()), now: NOW }), { activeMinutes: 5, projects: [] });
  assert.deepEqual(scanSessions({ root: fixture({}), activeMinutes: 9, now: NOW }), { activeMinutes: 9, projects: [] });
});

test('sessionList entries and aiTitle', () => {
  const root = fixture({
    'a/s1.jsonl': [line({ cwd: '/x/y', sessionId: 's1', timestamp: iso(20) }), line({ type: 'ai-title', aiTitle: 'Fix it', sessionId: 's1' })],
    'a/s2.jsonl': [line({ cwd: '/x/y', sessionId: 's2', timestamp: iso(10) })],
  });
  const p = scanSessions({ root, now: NOW }).projects[0];
  assert.equal(p.sessions, p.sessionList.length);
  const by = Object.fromEntries(p.sessionList.map((s) => [s.sessionId, s]));
  assert.deepEqual(by.s1, { sessionId: 's1', title: 'Fix it', lastActivity: iso(20) });
  assert.deepEqual(by.s2, { sessionId: 's2', title: '', lastActivity: iso(10) });
});
