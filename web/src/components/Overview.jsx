import { STATUSES } from '../lib.js'

const COLORS = { Extracted: '#cbd5e1', Confirmed: '#94a3b8', 'Spec Written': '#4f46e5', Built: '#10b981', Rejected: '#f87171' }

function Donut({ counts }) {
  const total = STATUSES.reduce((a, s) => a + (counts[s] || 0), 0)
  const R = 40, C = 2 * Math.PI * R
  let off = 0
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" width="130" height="130" role="img" aria-label="Requirement status">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {total > 0 && STATUSES.filter((s) => counts[s]).map((s) => {
          const len = (counts[s] / total) * C
          const el = <circle key={s} cx="50" cy="50" r={R} fill="none" stroke={COLORS[s]} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" />
          off += len
          return el
        })}
        <text x="50" y="50" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">{total}</text>
        <text x="50" y="63" textAnchor="middle" fontSize="7" fill="#6b7490">requirements</text>
      </svg>
      <ul className="space-y-1 text-[13px]">
        {STATUSES.filter((s) => counts[s]).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[s] }} />
            <span className="text-muted">{s}</span>
            <b className="ml-auto pl-4">{counts[s]}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Bars({ projects }) {
  const top = [...projects].sort((a, b) => b.sessions - a.sessions).slice(0, 6)
  const max = Math.max(1, ...top.map((p) => p.sessions))
  return (
    <ul className="space-y-2">
      {top.map((p) => (
        <li key={p.name} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3 text-[13px]">
          <span className="truncate text-muted" title={p.name}>{p.name}</span>
          <span className="h-2 overflow-hidden rounded-full bg-slate-100"><i className="block h-full rounded-full bg-primary" style={{ width: `${(p.sessions / max) * 100}%` }} /></span>
          <b className="text-right">{p.sessions}</b>
        </li>
      ))}
    </ul>
  )
}

export default function Overview({ projects }) {
  const counts = {}
  for (const p of projects) for (const [k, v] of Object.entries(p.requirements?.counts || {})) counts[k] = (counts[k] || 0) + v
  const panel = 'rounded-card border border-line bg-panel p-5 shadow-card'
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <section className={panel}><h2 className="mb-4 text-sm font-semibold">Requirement status</h2><Donut counts={counts} /></section>
      <section className={panel}><h2 className="mb-4 text-sm font-semibold">Sessions by project</h2><Bars projects={projects} /></section>
    </div>
  )
}
