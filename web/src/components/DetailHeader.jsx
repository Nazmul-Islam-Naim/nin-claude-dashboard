import { ActiveBadge } from './Badge.jsx'
import OpenButton from './OpenButton.jsx'
import { relTime, safeSheetUrl } from '../lib.js'

export default function DetailHeader({ p, canOpen }) {
  const sheet = safeSheetUrl(p.requirements?.sheetUrl)
  return (
    <header className="rounded-card border border-line bg-panel p-4 shadow-card sm:p-6">
      <a href="#/projects" className="text-sm text-primary">← Projects</a>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 break-words text-2xl font-bold">{p.name} <ActiveBadge active={p.active} /></h1>
          <p className="mt-1 break-all font-mono text-sm text-muted">{p.path}</p>
          <p className="mt-1 text-sm text-muted">শেষ session {relTime(p.lastActivity)} · {p.sessions} sessions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sheet && (
            <a href={sheet} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-primary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              Google Sheet ↗
            </a>
          )}
          {canOpen === true && <OpenButton project={p.name} />}
          {canOpen === true && p.run?.length > 0 && <OpenButton project={p.name} run title={p.run.join(' | ')} />}
        </div>
      </div>
    </header>
  )
}
