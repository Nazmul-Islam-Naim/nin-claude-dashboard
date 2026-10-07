import { useState } from 'react'
import { Pill } from './Badge.jsx'
import { PAGE, countByStatus, filterRequirements, limitList } from '../lib.js'

const CHIPS = ['All', 'Built', 'Spec Written', 'Confirmed', 'Extracted', 'Rejected']
const EDGE = {
  Built: 'border-l-success', 'Spec Written': 'border-l-primary',
  Confirmed: 'border-l-slate-300', Extracted: 'border-l-slate-300', Rejected: 'border-l-slate-200 opacity-75',
}
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'

function Card({ r }) {
  return (
    <li className={`flex min-w-0 flex-col rounded-card border border-l-4 border-line bg-panel p-3 shadow-card ${EDGE[r.status] ?? 'border-l-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-muted">{r.id}</span>
        <Pill>{r.status}</Pill>
      </div>
      <h3 className="mt-2 line-clamp-2 break-words font-semibold" title={r.title}>{r.title}</h3>
      {r.summary && <p className="mt-1 line-clamp-2 break-words text-[13px] text-muted" title={r.summary}>{r.summary}</p>}
      {(r.priority || r.spec) && (
        <p className="mt-auto pt-2 text-xs text-muted">
          {r.priority && <>Priority: {r.priority}</>}{r.priority && r.spec && ' · '}{r.spec && <>spec {r.spec}</>}
        </p>
      )}
    </li>
  )
}

export default function RequirementsGrid({ rows }) {
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const counts = countByStatus(rows)
  const shown = filterRequirements(rows, { status, query })
  const { items, rest } = limitList(shown, limit)
  const reset = () => setLimit(PAGE)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => { setStatus(s); reset() }}
              className={`rounded-full border px-3 py-1 text-sm ${focus} ${status === s ? 'border-primary bg-primary text-white' : 'border-line bg-panel hover:border-primary'}`}>
              {s} {s === 'All' ? rows.length : counts[s]}
            </button>
          ))}
        </div>
        <input type="search" aria-label="Requirement খুঁজুন (id বা title)" placeholder="id বা title খুঁজুন"
          value={query} onChange={(e) => { setQuery(e.target.value); reset() }}
          className={`w-full rounded-lg border border-line bg-panel px-3 py-1.5 text-sm sm:ml-auto sm:w-64 ${focus}`} />
      </div>
      {!shown.length ? <p className="text-muted">কোনো requirement মেলেনি</p> : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4">
          {items.map((r, i) => <Card key={r.id + i} r={r} />)}
        </ul>
      )}
      {rest > 0 && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => setLimit(limit + PAGE)}
            className={`rounded-lg border border-line bg-panel px-4 py-1.5 text-sm font-medium text-primary hover:border-primary ${focus}`}>
            আরও দেখান ({rest} বাকি)
          </button>
        </div>
      )}
    </>
  )
}
