import { Pill } from './Badge.jsx'

export default function RequirementsTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-panel">
      <table className="w-full text-left">
        <thead className="text-muted"><tr>{['ID', 'Title', 'Priority', 'Status', 'Spec'].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id + i} className="border-t border-line">
              <td className="whitespace-nowrap p-3">{r.id}</td>
              <td className="p-3">{r.title}</td>
              <td className="p-3">{r.priority}</td>
              <td className="p-3"><Pill>{r.status}</Pill></td>
              <td className="p-3">{r.spec}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
