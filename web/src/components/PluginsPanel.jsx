import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Async } from './States.jsx'
import { pluginsUrl, sendJson } from '../lib.js'

export default function PluginsPanel({ name, canOpen }) {
  const res = useApi(pluginsUrl(name))
  const [over, setOver] = useState({})
  const [msg, setMsg] = useState('')
  const toggle = async (pl, enabled) => {
    setMsg('')
    const r = await sendJson('PUT', pluginsUrl(name), { id: pl.id, enabled })
    if (r.ok) setOver((o) => ({ ...o, [pl.id]: enabled }))
    setMsg(r.ok ? (r.body.warning || '') : (r.body.error || 'Could not save'))
  }
  return (
    <section aria-labelledby="plg-h">
      <h2 id="plg-h" className="mb-3 mt-8 text-lg font-semibold">Claude plugins</h2>
      <Async res={res} isEmpty={(d) => !d.plugins?.length} empty="No plugins installed">
        {(d) => (
          <>
            <ul className="rounded-card border border-line bg-panel px-4 shadow-card">
              {d.plugins.map((pl) => {
                const on = over[pl.id] ?? pl.enabled
                return (
                  <li key={pl.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{pl.name} <span className="font-normal text-muted">{pl.marketplace !== pl.name && `@${pl.marketplace}`} {pl.version && `· ${pl.version}`}</span></p>
                      {pl.description && <p className="truncate text-xs text-muted" title={pl.description}>{pl.description}</p>}
                      {!pl.installed && <p className="text-xs text-red-700">Not installed</p>}
                    </div>
                    <span className="hidden text-xs text-muted sm:inline">{pl.source}</span>
                    <button
                      type="button" role="switch" aria-checked={on} aria-label={`${pl.name} enabled`}
                      disabled={canOpen !== true || !pl.installed}
                      onClick={() => toggle(pl, !on)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${on ? 'bg-primary' : 'bg-line'}`}
                    >
                      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
                    </button>
                  </li>
                )
              })}
            </ul>
            <p aria-live="polite" className="mt-2 text-xs text-muted">{msg || d.note}</p>
          </>
        )}
      </Async>
    </section>
  )
}
