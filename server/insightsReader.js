import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { filesByProject } from './scanner.js';

// ponytail: cache is unbounded per process; evict if many huge histories matter
const cache = new Map(); // file -> { key, records }
export const stats = { parsed: 0 };

function parseFile(file) {
  let st, text;
  try { st = fs.statSync(file); } catch { return []; }
  const key = `${file}|${st.mtimeMs}|${st.size}`;
  const hit = cache.get(file);
  if (hit && hit.key === key) return hit.records;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  stats.parsed++;
  const byId = new Map();
  for (const line of text.split('\n')) {
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const m = o && o.type === 'assistant' && o.message;
    if (!m || !m.id) continue;
    let r = byId.get(m.id);
    if (!r) byId.set(m.id, (r = { id: m.id, model: m.model, outputTokens: 0, ts: o.timestamp, skill: null, plugin: null }));
    const t = Number(m.usage && m.usage.output_tokens);
    if (t > r.outputTokens) r.outputTokens = t;
    if (!r.model && m.model) r.model = m.model;
    if (!r.skill && typeof o.attributionSkill === 'string' && o.attributionSkill) r.skill = o.attributionSkill;
    if (!r.plugin && typeof o.attributionPlugin === 'string' && o.attributionPlugin) r.plugin = o.attributionPlugin;
  }
  const records = [...byId.values()].filter((r) => r.model && r.model !== '<synthetic>');
  cache.set(file, { key, records });
  return records;
}

const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0);
const desc = (a, b) => b.responses - a.responses;

export function readInsights(projectPath, { root = path.join(os.homedir(), '.claude', 'projects'), days, now = Date.now() } = {}) {
  const d = Number(days) === 7 ? 7 : Number(days) === 30 ? 30 : null;
  const files = filesByProject(root).get(projectPath) || [];
  const merged = new Map();
  for (const f of files) for (const r of parseFile(f)) if (!merged.has(r.id)) merged.set(r.id, r);
  const none = { status: 'none', days: d, totals: { responses: 0, outputTokens: 0 }, models: [], plugins: [], skills: [] };
  if (!merged.size) return none;
  let recs = [...merged.values()];
  if (d) recs = recs.filter((r) => Date.parse(r.ts) >= now - d * 86400000);
  const total = recs.length;
  const group = (keyFn) => {
    const g = new Map();
    for (const r of recs) { const k = keyFn(r); if (k === undefined) continue; g.set(k, [...(g.get(k) || []), r]); }
    return g;
  };
  const pluginOf = (r) => r.plugin || (r.skill && r.skill.includes(':') ? r.skill.split(':')[0] : null);
  return {
    status: 'ok', days: d,
    totals: { responses: total, outputTokens: recs.reduce((s, r) => s + r.outputTokens, 0) },
    models: [...group((r) => r.model)].map(([model, rs]) => ({ model, responses: rs.length, percent: pct(rs.length, total), outputTokens: rs.reduce((s, r) => s + r.outputTokens, 0) })).sort(desc),
    plugins: [...group(pluginOf)].map(([plugin, rs]) => ({ plugin, responses: rs.length, percent: pct(rs.length, total) })).sort(desc),
    skills: [...group((r) => r.skill || undefined)].map(([skill, rs]) => ({ skill, plugin: pluginOf(rs[0]), responses: rs.length, percent: pct(rs.length, total) })).sort(desc).slice(0, 10),
  };
}
