import { useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Async, EmptyState } from '../components/States.jsx'
import { ActiveBadge } from '../components/Badge.jsx'
import SessionsTable from '../components/SessionsTable.jsx'
import RequirementsTable from '../components/RequirementsTable.jsx'
import { reqMessage } from '../components/ReqSummary.jsx'
import { findProject, progress, relTime } from '../lib.js'

const Back = () => <a href="#/projects" className="text-primary">← Projects</a>

export default function ProjectDetailPage({ name }) {
  const res = useApi('/api/projects')
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <Async res={res} isEmpty={() => false}>
      {(data) => {
        const p = findProject(data, name)
        if (!p) return <EmptyState message="project পাওয়া যায়নি"><p className="mt-3"><Back /></p></EmptyState>
        const msg = reqMessage(p.requirements)
        const { done, total } = progress(p.requirements)
        return (
          <>
            <Back />
            <div className="mb-8 mt-3">
              <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold">{p.name} <ActiveBadge active={p.active} /></h1>
              <p className="break-all text-muted">{p.path}</p>
              <p className="text-muted">শেষ session {relTime(p.lastActivity)} · {p.sessions} sessions</p>
            </div>
            <h2 className="mb-3 text-lg font-semibold">Sessions</h2>
            <div className="mb-8"><SessionsTable list={p.sessionList} activeMinutes={data.activeMinutes} /></div>
            <h2 className="mb-3 text-lg font-semibold">Requirements</h2>
            {msg && <p className="text-muted">{msg}</p>}
            {!msg && (
              <>
                <p className="mb-3 text-muted">{done}/{total} Spec Written</p>
                <RequirementsTable rows={p.requirements.rows} />
              </>
            )}
          </>
        )
      }}
    </Async>
  )
}
