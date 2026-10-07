import { ActiveBadge } from './Badge.jsx'
import { fullDate, isActive, projectHref, relTime } from '../lib.js'

export default function FeedItem({ item, activeMinutes }) {
  const title = item.title || '(শিরোনাম নেই)'
  return (
    <li className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <a href={projectHref(item.project)} className="shrink-0 font-semibold text-primary">{item.project}</a>
      <span className="min-w-0 flex-1 truncate" title={title}>{title}</span>
      <span className="shrink-0 text-muted" title={fullDate(item.lastActivity)}>{relTime(item.lastActivity)}</span>
      {isActive(item.lastActivity, activeMinutes) && <ActiveBadge active />}
    </li>
  )
}
