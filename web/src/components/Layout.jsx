import Tabs from './Tabs.jsx'

export default function Layout({ tab, children }) {
  return (
    <>
      <header className="flex items-center gap-6 border-b border-line bg-panel px-4 sm:px-8">
        <b className="shrink-0 font-bold">Nin Dashboard</b>
        <div className="min-w-0 flex-1"><Tabs tab={tab} /></div>
      </header>
      <main className="mx-auto max-w-[1080px] p-4 sm:py-8">{children}</main>
    </>
  )
}
