import { Pill } from './Badge.jsx'
import { projectHref } from '../lib.js'

export default function RequirementCard({ r }) {
  return (
    <li className="rounded-lg border border-line bg-panel p-3 shadow-card">
      <p className="font-semibold"><span className="text-muted">{r.id}</span> {r.title}</p>
      <p className="my-1 text-xs"><a href={projectHref(r.project)} className="text-primary">{r.project}</a></p>
      {r.priority && <Pill>Priority: {r.priority}</Pill>}
      {r.summary && <p className="mt-2 line-clamp-2 text-[13px] text-muted" title={r.summary}>{r.summary}</p>}
      {r.spec && <p className="mt-2 text-xs text-muted">spec {r.spec}</p>}
    </li>
  )
}
