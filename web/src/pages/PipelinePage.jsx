import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Async, Skeleton } from '../components/States.jsx'
import ProjectSelect from '../components/ProjectSelect.jsx'
import PipelineColumn from '../components/PipelineColumn.jsx'
import { STATUSES, pipelineUrl, unreadableCount } from '../lib.js'

export default function PipelinePage() {
  const [project, setProject] = useState('')
  const board = useApi(pipelineUrl(project))
  const projects = useApi('/api/projects')
  const n = unreadableCount(projects.data?.projects)
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <ProjectSelect projects={projects.data?.projects} value={project} onChange={setProject} />
      </div>
      {n > 0 && <p className="mb-4 text-xs text-muted">{n}টা project-এর Sheet পড়া যায়নি বা যুক্ত নেই</p>}
      <Async
        res={board}
        isEmpty={(d) => STATUSES.every((s) => !d[s]?.length)}
        empty="কোনো requirement নেই"
        skeleton={<Skeleton n={4} className="h-40" />}
      >
        {(d) => (
          <div className="grid gap-4 md:grid-cols-4">
            {STATUSES.map((s) => <PipelineColumn key={s} status={s} rows={d[s] || []} />)}
          </div>
        )}
      </Async>
    </>
  )
}
