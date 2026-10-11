// Pure helpers shared by pages (specs 006-009).
export const STATUSES = ['Extracted', 'Confirmed', 'Spec Written', 'Built', 'Rejected']

export const projectHref = (name) => `#/projects/${encodeURIComponent(name)}`

// Defence in depth: only Google Sheets URLs become links.
export const safeSheetUrl = (url) =>
  typeof url === 'string' && url.startsWith('https://docs.google.com/spreadsheets/') ? url : null

export function progress(req) {
  const c = req?.counts ?? {}
  const total = Object.values(c).reduce((s, n) => s + (n || 0), 0) - (c.Rejected || 0)
  return { done: c.Built || 0, total }
}

export const filterProjects = (projects, f) =>
  f === 'active' ? projects.filter((p) => p.active) : f === 'idle' ? projects.filter((p) => !p.active) : projects

export const feedUrl = (project) => (project ? '/api/feed?project=' + encodeURIComponent(project) : '/api/feed')
export const pipelineUrl = (project) =>
  project ? '/api/pipeline?project=' + encodeURIComponent(project) : '/api/pipeline'

export const isActive = (iso, activeMinutes, now = Date.now()) => now - new Date(iso).getTime() <= activeMinutes * 60000

export const findProject = (data, name) => data?.projects?.find((p) => p.name === name)

export const recentSessions = (list, n = 50) =>
  [...list].sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)).slice(0, n)

export const unreadableCount = (projects = []) => projects.filter((p) => p.requirements.source !== 'sheet').length

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function relTime(iso, now = Date.now()) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit)
  }
  return rtf.format(Math.min(s, 0), 'second')
}
export const fullDate = (iso) => new Date(iso).toLocaleString()

// Spec 013: POST /api/open. Never throws; returns { ok, error }.
export async function openProjectRequest(project, fetchFn = fetch, url = '/api/open') {
  try {
    const r = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    })
    const body = await r.json().catch(() => ({}))
    if (r.ok && body.ok !== false) return { ok: true }
    return { ok: false, error: body.error || 'Could not open' }
  } catch {
    return { ok: false, error: 'Could not open' }
  }
}

// idle -> opening -> opened (2 s) | error (4 s) -> idle. setState gets { s, error? }.
export async function runOpen(project, setState, fetchFn, url) {
  setState({ s: 'opening' })
  const r = await openProjectRequest(project, fetchFn, url)
  setState(r.ok ? { s: 'opened' } : { s: 'error', error: r.error })
  setTimeout(() => setState({ s: 'idle' }), r.ok ? 2000 : 4000)
}

// Spec 015: insights helpers.
export const insightsUrl = (project, days) =>
  '/api/insights?project=' + encodeURIComponent(project) + (days ? '&days=' + days : '')
export const fmtPercent = (p) => (Number(p) || 0).toFixed(1) + '%'
export const fmtTokens = (n) => (Number(n) || 0).toLocaleString('en-US')
// Bar width: exact percent, but never invisible when percent > 0.
export const barWidth = (p) => (p > 0 ? Math.max(Math.min(p, 100), 1) : 0)

// Spec 007 redesign: requirement grid helpers.
export const PAGE = 24
export const countByStatus = (rows = []) => {
  const c = Object.fromEntries(STATUSES.map((s) => [s, 0]))
  for (const r of rows) if (r.status in c) c[r.status]++
  return c
}
export function filterRequirements(rows = [], { status = 'All', query = '' } = {}) {
  const q = query.trim().toLowerCase()
  return rows.filter((r) =>
    (status === 'All' || r.status === status) &&
    (!q || String(r.id ?? '').toLowerCase().includes(q) || String(r.title ?? '').toLowerCase().includes(q)))
}
export const limitList = (list, limit) => ({ items: list.slice(0, limit), rest: Math.max(list.length - limit, 0) })
