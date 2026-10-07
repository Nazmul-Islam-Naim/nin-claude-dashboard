export const Skeleton = ({ n = 3, className = 'h-24' }) => (
  <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]" aria-busy="true">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className={`animate-pulse rounded-card bg-line ${className}`} />
    ))}
  </div>
)

export const EmptyState = ({ message, children }) => (
  <div className="rounded-card border border-dashed border-line bg-panel p-8 text-center text-muted">
    <p>{message}</p>
    {children}
  </div>
)

export const ErrorNote = ({ message }) => (
  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
    ডেটা আনা যায়নি{message ? ` (${message})` : ''}
  </p>
)

// Section state machine (spec 005): skeleton -> error -> empty -> content (+ small error on later failed poll).
export function Async({ res, isEmpty, empty, skeleton = <Skeleton />, children }) {
  const { data, loading, error } = res
  if (loading && !data) return skeleton
  if (!data) return <ErrorNote message={error} />
  if (isEmpty?.(data)) return <EmptyState message={empty} />
  return (
    <>
      {error && <div className="mb-3"><ErrorNote message={error} /></div>}
      {children(data)}
    </>
  )
}
