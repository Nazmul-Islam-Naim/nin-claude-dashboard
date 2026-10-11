import { MapLabel } from './Badge.jsx'
import { progress } from '../lib.js'

// Shared by ProjectCard (bar) and detail page (message only). Returns the 006 messages for non-ok states.
export function reqMessage(req) {
  if (req.status === 'no-sheet') return 'No Sheet or MAP'
  if (req.status === 'error') return 'Could not read Sheet'
  if (progress(req).total === 0) return 'No requirements'
  return null
}

const SEGMENTS = [['Built', 'bg-success'], ['Spec Written', 'bg-primary'], ['Confirmed', 'bg-slate-300'], ['Extracted', 'bg-slate-300']]

export default function ReqSummary({ req }) {
  const msg = reqMessage(req)
  if (msg) return <p className="text-[13px] text-muted">{msg}</p>
  const { done, total } = progress(req)
  const c = req.counts ?? {}
  const isMap = req.source === 'map'
  const parts = (isMap ? ['Built', 'Spec Written'] : ['Built', 'Spec Written', 'Confirmed', 'Extracted']).map((k) => `${k} ${c[k] || 0}`)
  return (
    <>
      <p className="mb-2 flex items-center justify-between text-[13px] font-semibold">
        <span>Development: {done}/{total} Built <span className="font-normal text-muted">· {Math.round((done / total) * 100)}%</span></span>
        {isMap && <MapLabel />}
      </p>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${done}/${total} Built`}>
        {SEGMENTS.map(([k, cls]) => (c[k] ? <i key={k} className={`block h-full ${cls}`} style={{ width: `${(c[k] / total) * 100}%` }} /> : null))}
      </div>
      <p className="mt-2 text-[13px] text-muted">Total {total} · {parts.join(' · ')}</p>
      {c.Rejected > 0 && <p className="mt-1 text-[13px] text-muted">Rejected {c.Rejected}</p>}
    </>
  )
}
