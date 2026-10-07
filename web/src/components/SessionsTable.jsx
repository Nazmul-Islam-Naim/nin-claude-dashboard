import { ActiveBadge } from './Badge.jsx'
import { fullDate, isActive, recentSessions, relTime } from '../lib.js'

export default function SessionsTable({ list, activeMinutes }) {
  if (!list.length) return <p className="text-muted">কোনো session নেই</p>
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-panel">
      <table className="w-full text-left">
        <thead className="text-muted"><tr><th className="p-3">Title</th><th className="p-3">Last activity</th><th className="p-3">Status</th></tr></thead>
        <tbody>
          {recentSessions(list).map((s) => (
            <tr key={s.sessionId} className="border-t border-line">
              <td className="p-3">{s.title || '(শিরোনাম নেই)'}</td>
              <td className="whitespace-nowrap p-3" title={fullDate(s.lastActivity)}>{relTime(s.lastActivity)}</td>
              <td className="p-3">{isActive(s.lastActivity, activeMinutes) && <ActiveBadge active />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
