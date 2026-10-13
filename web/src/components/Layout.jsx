import Tabs from './Tabs.jsx'
import AccentPicker from './AccentPicker.jsx'
import { useAccent, useLiveFavicon } from '../hooks/useTheme.js'

export default function Layout({ tab, children }) {
  const [accent, setAccent] = useAccent()
  useLiveFavicon(accent)
  return (
    <>
      <header className="flex items-center gap-6 border-b border-line bg-panel px-4 sm:px-8">
        <b className="shrink-0 font-bold">Nin Dashboard</b>
        <div className="min-w-0 flex-1"><Tabs tab={tab} /></div>
        <AccentPicker accent={accent} onChange={setAccent} />
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-8 sm:py-8">{children}</main>
    </>
  )
}
