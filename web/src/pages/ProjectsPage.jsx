import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Async, EmptyState, Skeleton } from '../components/States.jsx'
import KpiCard from '../components/KpiCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import { filterProjects } from '../lib.js'

export default function ProjectsPage() {
  const res = useApi('/api/projects')
  const [filter, setFilter] = useState('all')
  return (
    <>
      <h1 className="mb-5 text-2xl font-bold">Projects</h1>
      <Async res={res} isEmpty={(d) => d.projects.length === 0} empty="কোনো project পাওয়া যায়নি" skeleton={<Skeleton n={6} />}>
        {({ kpis, activeMinutes, projects, canOpen }) => {
          const shown = filterProjects(projects, filter)
          const counts = { all: projects.length, active: filterProjects(projects, 'active').length, idle: filterProjects(projects, 'idle').length }
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Active projects" value={kpis.activeProjects} />
                <KpiCard label="Sessions today" value={kpis.sessionsToday} />
                <KpiCard label="Open requirements" value={kpis.openRequirements} />
                <KpiCard label="Built" value={`${kpis.built}/${kpis.totalRequirements}`} />
              </div>
              <p className="mb-6 mt-2 text-xs text-muted">Active = শেষ {activeMinutes} মিনিট</p>
              <FilterBar value={filter} onChange={setFilter} counts={counts} />
              {shown.length === 0 ? (
                <EmptyState message="এই filter-এ কোনো project নেই" />
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
