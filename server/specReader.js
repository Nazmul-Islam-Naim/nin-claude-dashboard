import fs from 'node:fs';
import path from 'node:path';

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const clean = (s) => s.replace(/`/g, '').trim();

function specState(projectPath, spec) {
  try {
    const text = fs.readFileSync(path.join(projectPath, 'docs', 'specs', spec), 'utf8').split(/\r?\n/);
    if (text[0].trim() !== '---') return 'unknown';
    const end = text.indexOf('---', 1);
    const line = text.slice(1, end < 0 ? undefined : end).find((l) => /^status\s*:/i.test(l));
    const v = line?.replace(/^status\s*:/i, '').trim().replace(/^["']|["']$/g, '').toLowerCase();
    return v === 'built' || v === 'draft' ? v : 'unknown';
  } catch { return 'unknown'; }
}

// -> [{ id, title, spec, relation }] for every data row under the header; [] when malformed
function mapRows(projectPath) {
  let lines;
  try { lines = fs.readFileSync(path.join(projectPath, 'docs', 'specs', 'MAP.md'), 'utf8').split(/\r?\n/); } catch { return null; }
  let cols = null;
  const rows = [];
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const c = cells(line);
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    if (!cols) {
      const names = c.map((x) => x.toLowerCase());
      if (names.includes('id') && names.includes('spec')) cols = names;
      continue;
    }
    if (c.length < cols.length) continue;
    const get = (k) => clean(c[cols.indexOf(k)] ?? '');
    rows.push({ id: get('id'), title: get('title'), spec: get('spec'), relation: get('relation').toLowerCase() });
  }
  return rows;
}

export function readSpecs(projectPath) {
  try {
    const rows = mapRows(projectPath);
    if (!rows) return { status: 'none', specs: [] };
    const bySpec = new Map();
    for (const r of rows) {
      if (!r.spec) continue;
      if (r.relation.startsWith('creates') && !bySpec.has(r.spec)) bySpec.set(r.spec, { id: r.id, title: r.title, path: r.spec, status: specState(projectPath, r.spec) });
    }
    const specs = [...bySpec.values()];
    // ids of every row (incl. updates) pointing at a spec; hidden from JSON/deepEqual, used by specStatusById
    for (const s of specs) Object.defineProperty(s, 'ids', { value: rows.filter((r) => r.spec === s.path && r.id).map((r) => r.id) });
    return { status: 'ok', specs };
  } catch { return { status: 'none', specs: [] }; }
}

export function specStatusById(specs = []) {
  const out = {};
  for (const s of specs) for (const id of new Set([s.id, ...(s.ids || [])])) if (id) out[id] = s.status;
  return out;
}
