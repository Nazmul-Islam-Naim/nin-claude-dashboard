import { ActiveBadge } from './Badge.jsx'
import OpenButton from './OpenButton.jsx'
import ReqSummary from './ReqSummary.jsx'
import { projectHref, relTime, safeSheetUrl } from '../lib.js'

export default function ProjectCard({ p, canOpen }) {
  const sheet = safeSheetUrl(p.requirements?.sheetUrl)
  return (
    <div className="relative flex h-full flex-col rounded-card border border-line bg-panel p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-within:ring-2 focus-within:ring-primary">
      <h3 className="mb-1 flex items-center justify-between gap-2 text-base font-semibold">
        <a
          href={projectHref(p.name)}
          className="min-w-0 truncate outline-none after:absolute after:inset-0 after:content-['']"
        >
          {p.name}
        </a>
        <ActiveBadge active={p.active} />
      </h3>
      <p className="mb-4 text-muted">Last session {relTime(p.lastActivity)} · {p.sessions} sessions</p>
      <ReqSummary req={p.requirements} />
      {(sheet || canOpen) && (
        <div className="pointer-events-none relative z-10 mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4 *:pointer-events-auto">
          {sheet && (
            <a
              href={sheet}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open Google Sheet (${p.name})`}
              title="Google Sheet"
              className="inline-flex items-center rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              Sheet ↗
            </a>
          )}
          {canOpen === true && (
            <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <OpenButton project={p.name} />
              {p.run?.length > 0 && <OpenButton project={p.name} run title={p.run.join(' | ')} />}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
