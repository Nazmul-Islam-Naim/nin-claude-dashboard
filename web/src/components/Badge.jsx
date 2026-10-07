export const ActiveBadge = ({ active }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-muted'}`}>
    {active ? 'Active' : 'Idle'}
  </span>
)

export const Pill = ({ children }) => (
  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-fg">{children}</span>
)
