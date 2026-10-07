export default function FilterBar({ value, onChange, counts }) {
  return (
    <div className="mb-4 flex gap-2">
      {[['all', 'All'], ['active', 'Active'], ['idle', 'Idle']].map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`rounded-full border px-3 py-1 text-sm font-medium ${
            value === id ? 'border-primary bg-primary text-white' : 'border-line bg-panel text-muted hover:text-fg'
          }`}
        >
          {label} {counts[id]}
        </button>
      ))}
    </div>
  )
}
