import Layout from './components/Layout.jsx'
import { useHashRoute } from './hooks/useHashRoute.js'
import ProjectsPage from './pages/ProjectsPage.jsx'
import ProjectDetailPage from './pages/ProjectDetailPage.jsx'
import FeedPage from './pages/FeedPage.jsx'
import PipelinePage from './pages/PipelinePage.jsx'

export default function App() {
  const { tab, project } = useHashRoute()
  return (
    <Layout tab={tab}>
      {tab === 'feed' ? <FeedPage /> : tab === 'pipeline' ? <PipelinePage /> : project ? <ProjectDetailPage key={project} name={project} /> : <ProjectsPage />}
    </Layout>
  )
}
