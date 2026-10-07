import { reqMessage } from './ReqSummary.jsx'
import { progress } from '../lib.js'

const SEGMENTS = [['Built', 'bg-success'], ['Spec Written', 'bg-primary'], ['Confirmed', 'bg-slate-300'], ['Extracted', 'bg-slate-300']]

export default function ProgressSummary({ req }) {
  const msg = reqMessage(req)
  if (msg) return <p className="mt-6 text-muted">{msg}</p>
  const { done, total } = progress(req)
  const c = req.counts ?? {}
  return (
    <section aria-label="Progress" className="mt-6 rounded-card border border-line bg-panel p-4 shadow-card sm:p-6">
      <p className="text-3xl font-bold tabular-nums">{done}/{total} <span className="text-lg font-semibold text-muted">Built</span></p>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${done}/${total} Built`}>
        {SEGMENTS.map(([k, cls]) => (c[k] ? <i key={k} className={`block h-full ${cls}`} style={{ width: `${(c[k] / total) * 100}%` }} /> : null))}
      </div>
      <p className="mt-3 text-sm text-muted">
        {SEGMENTS.map(([k]) => `${k} ${c[k] || 0}`).join(' · ')}{c.Rejected > 0 && ` · Rejected ${c.Rejected}`}
      </p>
    </section>
  )
}
