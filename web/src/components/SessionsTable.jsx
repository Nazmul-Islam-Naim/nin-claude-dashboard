import { useState } from 'react'
import { ActiveBadge } from './Badge.jsx'
import { fullDate, isActive, limitList, recentSessions, relTime } from '../lib.js'

export default function SessionsTable({ list, activeMinutes }) {
  const [all, setAll] = useState(false)
  if (!list.length) return <p className="text-muted">কোনো session নেই</p>
  const sorted = recentSessions(list)
  const { items } = limitList(sorted, all ? 50 : 8)
  return (
    <div className="rounded-card border border-line bg-panel">
      <ul className="divide-y divide-line">
        {items.map((s) => (
          <li key={s.sessionId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
            <span className="min-w-0 flex-1 break-words">{s.title || '(শিরোনাম নেই)'}</span>
            <span className="whitespace-nowrap text-sm text-muted" title={fullDate(s.lastActivity)}>{relTime(s.lastActivity)}</span>
            {isActive(s.lastActivity, activeMinutes) && <ActiveBadge active />}
          </li>
        ))}
      </ul>
      {!all && sorted.length > 8 && (
        <div className="border-t border-line p-2 text-center">
          <button type="button" onClick={() => setAll(true)}
            className="rounded-lg px-3 py-1 text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            সব দেখান ({Math.min(sorted.length, 50)})
          </button>
        </div>
      )}
    </div>
  )
}
