import { specStatusById } from './specReader.js';

const STATUSES = ['Extracted', 'Confirmed', 'Spec Written', 'Built', 'Rejected'];
const day = (t) => new Date(t).toDateString();
const newestFirst = (a, b) => (a.lastActivity < b.lastActivity ? 1 : a.lastActivity > b.lastActivity ? -1 : 0);
const zero = () => Object.fromEntries(STATUSES.map((s) => [s, 0]));

export function resolveRequirements(sheet = { status: 'no-sheet', rows: [] }, specs = { status: 'none', specs: [] }) {
  const counts = zero();
  if (sheet.status === 'ok') {
    const built = specStatusById(specs.specs);
    const rows = sheet.rows.map((r) => (built[(r.spec || '').trim()] === 'built' ? { ...r, status: 'Built' } : r));
    for (const r of rows) if (r.status in counts) counts[r.status]++;
    return { status: 'ok', source: 'sheet', counts, rows, ...(sheet.sheetUrl && { sheetUrl: sheet.sheetUrl }) };
  }
  if (sheet.status === 'error') return { status: 'error', source: 'none', counts, rows: [], error: sheet.error, ...(sheet.sheetUrl && { sheetUrl: sheet.sheetUrl }) };
  if (specs.status === 'ok' && specs.specs.length) {
    const label = { built: 'Built', draft: 'Spec Written' };
    const rows = specs.specs.map((s) => ({ id: s.id, title: s.title, summary: '', source: 'MAP', priority: '', status: label[s.status] || 'Unknown', spec: s.id }));
    for (const r of rows) if (r.status in counts) counts[r.status]++;
    return { status: 'ok', source: 'map', counts, rows };
  }
  return { status: 'no-sheet', source: 'none', counts, rows: [] };
}

export function aggregate(scan, sheets = {}, specs = {}, now = Date.now()) {
  const projects = scan.projects.map((p) => ({
    name: p.path.split('/').pop(), path: p.path, sessions: p.sessions, lastActivity: p.lastActivity, active: p.active, sessionList: p.sessionList,
    requirements: resolveRequirements(sheets[p.path], specs[p.path]),
  }));
  projects.sort((a, b) => b.active - a.active || newestFirst(a, b));
  const today = day(now);
  const sum = (...keys) => projects.reduce((n, p) => n + keys.reduce((m, k) => m + p.requirements.counts[k], 0), 0);
  return {
    activeMinutes: scan.activeMinutes,
    kpis: {
      activeProjects: projects.filter((p) => p.active).length,
      sessionsToday: projects.reduce((n, p) => n + p.sessionList.filter((s) => day(s.lastActivity) === today).length, 0),
      openRequirements: sum('Extracted', 'Confirmed', 'Spec Written'),
      built: sum('Built'),
      totalRequirements: sum('Extracted', 'Confirmed', 'Spec Written', 'Built'),
    },
    projects,
  };
}
const pick = (projects, name) => (name ? projects.filter((p) => p.name === name) : projects);

export function feed(projects, name) {
  return pick(projects, name)
    .flatMap((p) => p.sessionList.map((s) => ({ project: p.name, sessionId: s.sessionId, title: s.title, lastActivity: s.lastActivity })))
    .sort(newestFirst)
    .slice(0, 100);
}

export function pipeline(projects, name) {
  const out = Object.fromEntries(STATUSES.map((s) => [s, []]));
  for (const p of pick(projects, name).filter((q) => q.requirements.source === 'sheet'))
    for (const row of p.requirements.rows) if (row.status in out) out[row.status].push({ project: p.name, ...row });
  return out;
}
