import { useState } from 'react'
import { sendJson, serviceError, serviceUrl } from '../lib.js'
import { REFRESH_EVENT } from '../hooks/useApi.js'

export default function ServiceRow({ project, s }) {
  const [port, setPort] = useState(s.port ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const running = s.state === 'running'
  const call = async (fn) => { setBusy(true); setMsg(''); const r = await fn(); setBusy(false); if (!r.ok) setMsg(serviceError(r)); window.dispatchEvent(new Event(REFRESH_EVENT)); return r }
  const save = () => {
    const v = String(port).trim()
    const next = v === '' ? null : Number(v)
    if (next === s.port || (next === null && s.port === null)) return
    return call(() => sendJson('PUT', '/api/port', { project, run: s.key, port: next }))
  }
  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm" title={s.key}>{s.key}</p>
        {running && serviceUrl(s.port) && (
          <a href={serviceUrl(s.port)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">localhost:{s.port} ↗</a>
        )}
        <p aria-live="polite" className="text-xs text-red-700 empty:hidden">{msg}</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 text-sm ${running ? 'text-success' : 'text-muted'}`}>
        <span aria-hidden="true">●</span>{running ? 'Running' : 'Stopped'}
      </span>
      <label className="flex items-center gap-2 text-sm text-muted">
        Port
        <input
          type="number" inputMode="numeric" min="1024" max="65535" placeholder="auto"
          value={port} disabled={running || busy}
          onChange={(e) => setPort(e.target.value)} onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label={`Port for ${s.key}`}
          className="w-24 rounded-lg border border-line bg-panel px-2 py-1.5 text-fg disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <button
        type="button" disabled={busy}
        onClick={() => call(() => sendJson('POST', running ? '/api/stop' : '/api/run', { project, run: s.key }))}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${running ? 'border border-line bg-panel text-primary hover:border-primary' : 'bg-primary text-white hover:opacity-90'}`}
      >
        {running ? 'Stop' : 'Start'}
      </button>
    </li>
  )
}

