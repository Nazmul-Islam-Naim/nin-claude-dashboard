import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Skeleton, EmptyState, ErrorNote } from './States.jsx'
import { barWidth, fmtPercent, fmtTokens, insightsUrl } from '../lib.js'

const RANGES = [['', 'All time'], ['30', 'Last 30 days'], ['7', 'Last 7 days']]

const SHOW = 5

function Row({ name, sub, row, extra, tone }) {
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 break-words">
          <span className="font-medium">{name}</span>
          {sub && <span className="ml-2 text-sm text-muted">{sub}</span>}
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums">{fmtPercent(row.percent)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-line" aria-hidden="true">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: barWidth(row.percent) + '%' }} />
      </div>
      <p className="mt-1 text-xs tabular-nums text-muted">{row.responses} responses{extra}</p>
    </li>
  )
}

function Block({ title, children }) {
  const [all, setAll] = useState(false)
  return (
    <div className="min-w-0 rounded-card border border-line bg-panel p-4 shadow-card">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="divide-y divide-line">{all ? children : children.slice(0, SHOW)}</ul>
      {!all && children.length > SHOW && (
        <button type="button" onClick={() => setAll(true)}
          className="mt-2 rounded-lg px-2 py-1 text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          Show all ({children.length})
        </button>
      )}
    </div>
  )
}

export default function InsightsSection({ name }) {
  const [days, setDays] = useState('')
  const { data, loading, error } = useApi(insightsUrl(name, days))
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Insights</h2>
        <select aria-label="Time range" value={days} onChange={(e) => setDays(e.target.value)}
          className="rounded-lg border border-line bg-panel px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {loading && !data ? <Skeleton n={2} className="h-20" />
        : !data ? <ErrorNote message={error} />
        : data.status === 'none' || !data.totals?.responses ? <EmptyState message="No data yet" />
        : (
          <>
            {error && <div className="mb-3"><ErrorNote message={error} /></div>}
            <div className="grid gap-4 lg:grid-cols-3">
            <Block title="Models">
              {data.models.map((m) => (
                <Row key={m.model} name={m.model} row={m} tone="bg-primary" extra={` · ${fmtTokens(m.outputTokens)} output tokens`} />
              ))}
            </Block>
            <Block title="Plugins">
              {data.plugins.map((p) => (
                <Row key={p.plugin ?? '_none'} name={p.plugin ?? 'No plugin'} row={p} tone="bg-success" />
              ))}
            </Block>
            <Block title="Skills">
              {data.skills.map((s) => (
                <Row key={s.skill} name={s.skill} sub={s.plugin} row={s} tone="bg-primary" />
              ))}
            </Block>
            </div>
          </>
        )}
    </section>
  )
}
