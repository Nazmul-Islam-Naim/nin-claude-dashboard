import { useEffect, useRef, useState } from 'react'
import ServiceRow from './ServiceRow.jsx'
import { REFRESH_EVENT } from '../hooks/useApi.js'
import { runningServices, sendJson, serviceError } from '../lib.js'

export default function ServicesModal({ p, onClose }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => { if (d?.open) d.close() }
  }, [])
  const all = async (start) => {
    setBusy(true); setMsg('')
    const targets = start ? p.services.filter((s) => s.state !== 'running') : runningServices(p)
    for (const s of targets) {
      const r = await sendJson('POST', start ? '/api/run' : '/api/stop', { project: p.name, run: s.key })
      if (!r.ok) { setMsg(`${s.key}: ${serviceError(r)}`); break }
    }
    setBusy(false)
    window.dispatchEvent(new Event(REFRESH_EVENT))
  }
  const running = runningServices(p).length
  return (
    <dialog
      ref={ref}
      aria-labelledby="svc-modal-h"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-card border border-line bg-panel p-0 text-fg shadow-2xl backdrop:bg-fg/45 max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id="svc-modal-h" className="text-base font-semibold">Servers · {p.name}</h2>
        <button type="button" onClick={() => ref.current.close()} aria-label="Close"
          className="h-8 w-8 rounded-lg text-muted hover:bg-bg hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">✕</button>
      </div>
      <ul className="px-5">{p.services.map((s) => <ServiceRow key={s.key} project={p.name} s={s} />)}</ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg px-5 py-3">
        <p aria-live="polite" className={`min-w-0 flex-1 text-xs ${msg ? 'text-red-700' : 'text-muted'}`}>{msg || 'A saved port is always used; if it is busy the start is blocked. Leave empty for a free port.'}</p>
        {p.services.length > 1 && (
          <button type="button" disabled={busy} onClick={() => all(running < p.services.length)}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {running < p.services.length ? 'Start all' : 'Stop all'}
          </button>
        )}
      </div>
    </dialog>
  )
}
