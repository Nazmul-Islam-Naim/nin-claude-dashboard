const STATUSES = ['Extracted', 'Confirmed', 'Spec Written', 'Rejected'];
const day = (t) => new Date(t).toDateString();
const newestFirst = (a, b) => (a.lastActivity < b.lastActivity ? 1 : a.lastActivity > b.lastActivity ? -1 : 0);

export function aggregate(scan, sheets = {}, now = Date.now()) {
  const projects = scan.projects.map((p) => {
    const r = sheets[p.path] || { status: 'no-sheet', rows: [] };
    const ok = r.status === 'ok';
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    if (ok) for (const row of r.rows) if (row.status in counts) counts[row.status]++;
    const requirements = { status: r.status, counts, rows: ok ? r.rows : [] };
    if (r.status === 'error') requirements.error = r.error;
    return { name: p.path.split('/').pop(), path: p.path, sessions: p.sessions, lastActivity: p.lastActivity, active: p.active, sessionList: p.sessionList, requirements };
  });
  projects.sort((a, b) => b.active - a.active || newestFirst(a, b));
  const today = day(now);
  return {
    activeMinutes: scan.activeMinutes,
    kpis: {
      activeProjects: projects.filter((p) => p.active).length,
      sessionsToday: projects.reduce((n, p) => n + p.sessionList.filter((s) => day(s.lastActivity) === today).length, 0),
      openRequirements: projects.reduce((n, p) => n + p.requirements.counts.Extracted + p.requirements.counts.Confirmed, 0),
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
  for (const p of pick(projects, name))
    for (const row of p.requirements.rows) if (row.status in out) out[row.status].push({ project: p.name, ...row });
  return out;
}
