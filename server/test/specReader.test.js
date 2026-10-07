import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSpecs, specStatusById } from '../specReader.js';

const HEAD = '| id | title | spec | relation | date |\n|---|---|---|---|---|\n';
function proj(map, specs = {}, eol = '\n') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-'));
  fs.mkdirSync(path.join(dir, 'docs', 'specs', 'specs'), { recursive: true });
  if (map !== null) fs.writeFileSync(path.join(dir, 'docs', 'specs', 'MAP.md'), map.replace(/\n/g, eol));
  for (const [f, status] of Object.entries(specs)) fs.writeFileSync(path.join(dir, 'docs', 'specs', 'specs', f), `---\nid: x\nstatus: ${status}\n---\nbody\n`.replace(/\n/g, eol));
  return dir;
}
const MAP = HEAD + '| 001 | One | specs/001.md | creates | 2026-01-01 |\n| 002 | Two | specs/002.md | creates | 2026-01-02 |\n| 003 | Three | specs/003.md | creates | 2026-01-03 |\n| 004 | Up | specs/001.md | updates 001 | 2026-01-04 |\n| 005 | Up2 | specs/002.md | updates 002 | 2026-01-05 |\n';
const FILES = { '001.md': 'built', '002.md': '"draft"', '003.md': 'weird' };

test('creates rows only: 3 specs, not 5', () => {
  assert.equal(readSpecs(proj(MAP, FILES)).specs.length, 3);
});

test('status values: built, quoted draft, other unknown', () => {
  const r = readSpecs(proj(MAP, FILES));
  assert.deepEqual(r.specs.map((s) => s.status), ['built', 'draft', 'unknown']);
  assert.deepEqual(r.specs[0], { id: '001', title: 'One', path: 'specs/001.md', status: 'built' });
});

test('missing spec file is unknown, others unaffected', () => {
  const r = readSpecs(proj(MAP, { '001.md': 'built' }));
  assert.deepEqual(r.specs.map((s) => s.status), ['built', 'unknown', 'unknown']);
});

test('"built" in MAP text does not change status', () => {
  const map = HEAD + '| 001 | Built it | specs/001.md | creates (built) | built 2026 |\n';
  assert.equal(readSpecs(proj(map, { '001.md': 'draft' })).specs[0].status, 'draft');
});

test('missing MAP -> none', () => {
  assert.deepEqual(readSpecs(proj(null)), { status: 'none', specs: [] });
});

test('CRLF parses like LF', () => {
  assert.deepEqual(readSpecs(proj(MAP, FILES, '\r\n')), readSpecs(proj(MAP, FILES)));
});

test('specStatusById resolves updates ids, omits unknown ids', () => {
  const m = specStatusById(readSpecs(proj(MAP, FILES)).specs);
  assert.deepEqual(m, { '001': 'built', '004': 'built', '002': 'draft', '005': 'draft', '003': 'unknown' });
  assert.equal('999' in m, false);
});

test('malformed MAP -> ok with no specs', () => {
  assert.deepEqual(readSpecs(proj('just text\n| a | b |\n| c | d |\n')), { status: 'ok', specs: [] });
});
