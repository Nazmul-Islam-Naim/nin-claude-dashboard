import { useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Async, EmptyState } from '../components/States.jsx'
import { MapLabel } from '../components/Badge.jsx'
import DetailHeader from '../components/DetailHeader.jsx'
import ProgressSummary from '../components/ProgressSummary.jsx'
import SessionsTable from '../components/SessionsTable.jsx'
import InsightsSection from '../components/InsightsSection.jsx'
import RequirementsGrid from '../components/RequirementsGrid.jsx'
import { reqMessage } from '../components/ReqSummary.jsx'
import { findProject } from '../lib.js'

const Back = () => <a href="#/projects" className="text-primary">← Projects</a>

export default function ProjectDetailPage({ name }) {
  const res = useApi('/api/projects')
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <Async res={res} isEmpty={() => false}>
      {(data) => {
        const p = findProject(data, name)
        if (!p) return <EmptyState message="Project not found"><p className="mt-3"><Back /></p></EmptyState>
        const msg = reqMessage(p.requirements)
        return (
          <>
            <DetailHeader p={p} canOpen={data.canOpen} />
            <ProgressSummary req={p.requirements} />
            <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold">Requirements {p.requirements.source === 'map' && <MapLabel />}</h2>
            {!msg && <RequirementsGrid rows={p.requirements.rows} />}
            <InsightsSection name={p.name} />
            <h2 className="mb-3 mt-8 text-lg font-semibold">Sessions</h2>
            <SessionsTable list={p.sessionList} activeMinutes={data.activeMinutes} />
          </>
        )
      }}
    </Async>
  )
}
