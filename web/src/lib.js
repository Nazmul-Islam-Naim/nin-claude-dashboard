// Pure helpers shared by pages (specs 006-009).
export const STATUSES = ['Extracted', 'Confirmed', 'Spec Written', 'Rejected']

export const projectHref = (name) => `#/projects/${encodeURIComponent(name)}`

export function progress(req) {
  const c = req?.counts ?? {}
  const total = STATUSES.reduce((s, k) => s + (c[k] || 0), 0) - (c.Rejected || 0)
  return { done: c['Spec Written'] || 0, total }
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

export const unreadableCount = (projects = []) => projects.filter((p) => p.requirements.status !== 'ok').length

const rtf = new Intl.RelativeTimeFormat('bn', { numeric: 'auto' })
export function relTime(iso, now = Date.now()) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit)
  }
  return rtf.format(Math.min(s, 0), 'second')
}
export const fullDate = (iso) => new Date(iso).toLocaleString()
