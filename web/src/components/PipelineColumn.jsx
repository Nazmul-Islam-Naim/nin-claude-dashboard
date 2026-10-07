import RequirementCard from './RequirementCard.jsx'

export default function PipelineColumn({ status, rows }) {
  const muted = status === 'Rejected'
  return (
    <section className={`rounded-card p-3 ${muted ? 'bg-slate-100' : 'bg-indigo-50/60'}`}>
      <h2 className={`mb-3 font-semibold ${muted ? 'text-muted' : 'text-fg'}`}>{status} {rows.length}</h2>
      {rows.length === 0 ? (
        <p className="text-muted">কিছু নেই</p>
      ) : (
        <ul className={`space-y-2 ${muted ? 'opacity-80' : ''}`}>
          {rows.map((r, i) => <RequirementCard key={r.project + r.id + i} r={r} />)}
        </ul>
      )}
    </section>
  )
}
