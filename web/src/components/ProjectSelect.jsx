import { useEffect } from 'react'

// Shared by Feed and Pipeline. Resets to "all" if the chosen project disappears.
export default function ProjectSelect({ projects, value, onChange }) {
  const names = projects?.map((p) => p.name)
  useEffect(() => {
    if (names && value && !names.includes(value)) onChange('')
  }, [names?.join('\n'), value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <select
      aria-label="Project"
      value={names?.includes(value) ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-panel px-3 py-2"
    >
      <option value="">সব project</option>
      {names?.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}
