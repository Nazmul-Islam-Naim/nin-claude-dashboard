export default function KpiCard({ label, value, onClick, bar, hint }) {
  const cls = 'rounded-card border border-line bg-panel p-5 text-left shadow-card'
  const body = (
    <>
      <small className="text-muted">{label}</small>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold">{value}</span>
        {hint && <span className="text-xs font-medium text-muted">{hint}</span>}
      </div>
      {bar != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${Math.round(bar)}%`}>
          <i className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(Math.max(bar, 0), 100)}%` }} />
        </div>
      )}
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} transition hover:-translate-y-0.5 hover:border-primary`}>{body}</button>
    : <div className={cls}>{body}</div>
}
