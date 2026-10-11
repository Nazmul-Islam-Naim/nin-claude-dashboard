import RequirementCard from './RequirementCard.jsx'

export default function PipelineColumn({ status, rows }) {
  const muted = status === 'Rejected'
  const built = status === 'Built'
  return (
    <section className={`rounded-card p-3 ${muted ? 'bg-slate-100' : built ? 'bg-emerald-50' : 'bg-indigo-50/60'}`}>
      <h2 className={`mb-3 font-semibold ${muted ? 'text-muted' : built ? 'text-emerald-800' : 'text-fg'}`}>{status} {rows.length}</h2>
      {rows.length === 0 ? (
        <p className="text-muted">Nothing here</p>
      ) : (
        <ul className={`space-y-2 ${muted ? 'opacity-80' : ''}`}>
          {rows.map((r, i) => <RequirementCard key={r.project + r.id + i} r={r} />)}
        </ul>
      )}
    </section>
  )
}
