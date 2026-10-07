import { ActiveBadge } from './Badge.jsx'
import ReqSummary from './ReqSummary.jsx'
import { projectHref, relTime } from '../lib.js'

export default function ProjectCard({ p }) {
  return (
    <a href={projectHref(p.name)} className="block rounded-card border border-line bg-panel p-5 shadow-card hover:border-primary">
      <h3 className="mb-1 flex items-center justify-between gap-2 text-base font-semibold">
        <span className="min-w-0 truncate">{p.name}</span>
        <ActiveBadge active={p.active} />
      </h3>
      <p className="mb-4 text-muted">শেষ session {relTime(p.lastActivity)} · {p.sessions} sessions</p>
      <ReqSummary req={p.requirements} />
    </a>
  )
}
