import { useState } from 'react'
import { ActiveBadge } from './Badge.jsx'
import OpenButton, { iconBtn } from './OpenButton.jsx'
import ReqSummary from './ReqSummary.jsx'
import ServicesModal from './ServicesModal.jsx'
import { projectHref, relTime, runningServices, safeSheetUrl, serviceUrl } from '../lib.js'

const serversBtn = 'inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:shadow-lg active:scale-[.97] motion-reduce:transform-none motion-reduce:transition-none sm:py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export default function ProjectCard({ p, canOpen }) {
  const [open, setOpen] = useState(false)
  const sheet = safeSheetUrl(p.requirements?.sheetUrl)
  const running = runningServices(p)
  const showServers = canOpen === true && p.services?.length > 0
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
        <div className="pointer-events-none relative z-10 mt-auto *:pointer-events-auto">
          {running.length > 0 && (
            <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold"><span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />{running.length} running</span>
              {running.map((s) => serviceUrl(s.port) && (
                <a key={s.key} href={serviceUrl(s.port)} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">localhost:{s.port} ↗</a>
              ))}
            </p>
          )}
          <div className="flex items-center gap-2 border-t border-line pt-4">
            {showServers && (
              <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Servers (${p.name})`} className={serversBtn}>
                {running.length > 0
                  ? <span className="h-2 w-2 rounded-full border-[1.5px] border-white bg-success" aria-hidden="true" />
                  : <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="12" height="4" rx="1" /><rect x="2" y="9" width="12" height="4" rx="1" /></svg>}
                Servers{running.length > 0 && ` · ${running.length}`}
              </button>
            )}
            <span className="ml-auto flex items-center gap-2">
              {canOpen === true && <OpenButton project={p.name} icon title="Open in VS Code" />}
              {sheet && (
                <a
                  href={sheet} target="_blank" rel="noopener noreferrer"
                  aria-label={`Open Google Sheet (${p.name})`} title="Google Sheet" className={iconBtn}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="2" width="11" height="12" rx="1.5" /><path d="M2.5 6h11M2.5 10h11M7 6v8" /></svg>
                </a>
              )}
            </span>
          </div>
        </div>
      )}
      {open && <ServicesModal p={p} onClose={() => setOpen(false)} />}
    </div>
  )
}
