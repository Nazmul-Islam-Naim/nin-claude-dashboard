import { ActiveBadge } from './Badge.jsx'
import OpenButton from './OpenButton.jsx'
import ReqSummary from './ReqSummary.jsx'
import { projectHref, relTime, safeSheetUrl } from '../lib.js'

export default function ProjectCard({ p, canOpen }) {
  const sheet = safeSheetUrl(p.requirements?.sheetUrl)
  return (
    <div className="relative rounded-card border border-line bg-panel p-5 shadow-card hover:border-primary focus-within:ring-2 focus-within:ring-primary">
      <h3 className="mb-1 flex items-center justify-between gap-2 text-base font-semibold">
        <a
          href={projectHref(p.name)}
          className="min-w-0 truncate outline-none after:absolute after:inset-0 after:content-['']"
        >
          {p.name}
        </a>
        <ActiveBadge active={p.active} />
      </h3>
      <p className="mb-4 text-muted">শেষ session {relTime(p.lastActivity)} · {p.sessions} sessions</p>
      <ReqSummary req={p.requirements} />
      {(sheet || canOpen) && (
        <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap items-center gap-3 *:pointer-events-auto">
        {sheet && (
        <a
          href={sheet}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Google Sheet খুলুন (${p.name})`}
          className="inline-block text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Sheet ↗
        </a>
      )}
        {canOpen === true && <OpenButton project={p.name} />}
        </div>
      )}
    </div>
  )
}
