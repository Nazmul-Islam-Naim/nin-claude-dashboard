export default function KpiCard({ label, value }) {
  return (
    <div className="rounded-card border border-line bg-panel p-5 shadow-card">
      <small className="text-muted">{label}</small>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  )
}
