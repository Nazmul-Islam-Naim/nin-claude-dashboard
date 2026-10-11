export const SORTS = [['recent', 'সর্বশেষ activity'], ['name', 'নাম (A–Z)'], ['sessions', 'বেশি session'], ['progress', 'বেশি অগ্রগতি']]

export default function FilterBar({ value, onChange, counts, query, onQuery, sort, onSort }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
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
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Project খুঁজুন…"
        aria-label="Project খুঁজুন"
        className="ml-auto w-full rounded-lg border border-line bg-panel px-3 py-1.5 text-sm sm:w-56"
      />
      <select value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Sort" className="rounded-lg border border-line bg-panel px-2 py-1.5 text-sm">
        {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </div>
  )
}
