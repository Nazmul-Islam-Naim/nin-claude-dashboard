import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Async, EmptyState, Skeleton } from '../components/States.jsx'
import KpiCard from '../components/KpiCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import Overview from '../components/Overview.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import { filterProjects } from '../lib.js'

export default function ProjectsPage() {
  const res = useApi('/api/projects')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  return (
    <>
      <h1 className="mb-5 text-2xl font-bold">Projects</h1>
      <Async res={res} isEmpty={(d) => d.projects.length === 0} empty="No projects found" skeleton={<Skeleton n={6} />}>
        {({ kpis, activeMinutes, projects, canOpen }) => {
          const q = query.trim().toLowerCase()
          const pct = (p) => { const c = p.requirements?.counts; const t = c ? Object.values(c).reduce((a, b) => a + b, 0) : 0; return t ? c.Built / t : 0 }
          const by = { recent: (a, b) => b.lastActivity.localeCompare(a.lastActivity), name: (a, b) => a.name.localeCompare(b.name), sessions: (a, b) => b.sessions - a.sessions, progress: (a, b) => pct(b) - pct(a) }[sort]
          const shown = filterProjects(projects, filter).filter((p) => p.name.toLowerCase().includes(q)).sort(by)
          const counts = { all: projects.length, active: filterProjects(projects, 'active').length, idle: filterProjects(projects, 'idle').length }
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Active projects" value={kpis.activeProjects} hint={`/ ${projects.length}`} bar={projects.length ? (kpis.activeProjects / projects.length) * 100 : 0} onClick={() => setFilter('active')} />
                <KpiCard label="Sessions today" value={kpis.sessionsToday} />
                <KpiCard label="Open requirements" value={kpis.openRequirements} />
                <KpiCard label="Built" value={`${kpis.built}/${kpis.totalRequirements}`} bar={kpis.totalRequirements ? (kpis.built / kpis.totalRequirements) * 100 : 0} hint={kpis.totalRequirements ? `${Math.round((kpis.built / kpis.totalRequirements) * 100)}%` : ''} />
              </div>
              <p className="mb-4 mt-2 text-xs text-muted">Active = last {activeMinutes} min</p>
              <Overview projects={projects} />
              <FilterBar value={filter} onChange={setFilter} counts={counts} query={query} onQuery={setQuery} sort={sort} onSort={setSort} />
              {shown.length === 0 ? (
                <EmptyState message="No projects match this filter" />
              ) : (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
                  {shown.map((p) => <ProjectCard key={p.name} p={p} canOpen={canOpen === true} />)}
                </div>
              )}
            </>
          )
        }}
      </Async>
    </>
  )
}
