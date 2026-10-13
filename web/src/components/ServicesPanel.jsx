import ServiceRow from './ServiceRow.jsx'

export default function ServicesPanel({ p }) {
  if (!p.services?.length) return null
  return (
    <section aria-labelledby="svc-h">
      <h2 id="svc-h" className="mb-3 mt-8 text-lg font-semibold">Servers</h2>
      <ul className="rounded-card border border-line bg-panel px-4 shadow-card">
        {p.services.map((s) => <ServiceRow key={s.key} project={p.name} s={s} />)}
      </ul>
      <p className="mt-2 text-xs text-muted">A saved port is always used; if it is busy the start is blocked. Leave empty for a free port.</p>
    </section>
  )
}
