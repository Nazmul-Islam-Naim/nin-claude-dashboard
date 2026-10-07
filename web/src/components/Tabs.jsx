const TABS = [['projects', 'Projects'], ['feed', 'Live feed'], ['pipeline', 'Pipeline']]

export default function Tabs({ tab }) {
  return (
    <nav aria-label="Main" className="flex gap-7 overflow-x-auto">
      {TABS.map(([id, label]) => (
        <a
          key={id}
          href={`#/${id}`}
          aria-current={tab === id ? 'page' : undefined}
          className={`flex h-14 shrink-0 items-center border-b-2 font-medium ${
            tab === id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg'
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}
