import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'
import { Async } from '../components/States.jsx'
import ProjectSelect from '../components/ProjectSelect.jsx'
import FeedItem from '../components/FeedItem.jsx'
import { feedUrl } from '../lib.js'

export default function FeedPage() {
  const [project, setProject] = useState('')
  const feed = useApi(feedUrl(project))
  const projects = useApi('/api/projects')
  const activeMinutes = projects.data?.activeMinutes ?? 5
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Live feed</h1>
        <ProjectSelect projects={projects.data?.projects} value={project} onChange={setProject} />
      </div>
      <Async res={feed} isEmpty={(d) => d.length === 0} empty="No activity">
        {(items) => (
          <>
            <ul className="rounded-card border border-line bg-panel shadow-card">
              {items.map((i) => <FeedItem key={i.project + i.sessionId} item={i} activeMinutes={activeMinutes} />)}
            </ul>
            {items.length === 100 && <p className="mt-3 text-xs text-muted">Showing the latest 100</p>}
          </>
        )}
      </Async>
    </>
  )
}
