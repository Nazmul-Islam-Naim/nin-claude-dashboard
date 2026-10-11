import { useEffect, useRef, useState } from 'react'
import { runOpen } from '../lib.js'

const base = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const Icon = ({ d }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

export default function OpenButton({ project, className = '', run = false, title }) {
  const text = run ? 'Server চালু করুন' : 'VS Code-এ খুলুন'
  const short = run ? 'Server চালু' : 'VS Code'
  const [st, setSt] = useState({ s: 'idle' })
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  const set = (v) => alive.current && setSt(v)
  const label = { idle: short, opening: 'খুলছে…', opened: run ? 'চালু ✓' : 'খোলা ✓', error: short }[st.s]
  const look = run
    ? 'bg-primary text-white hover:opacity-90'
    : 'border border-line bg-panel text-primary hover:border-primary'
  return (
    <span className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        title={title}
        disabled={st.s === 'opening'}
        aria-label={`${text} (${project})`}
        onClick={() => runOpen(project, set, undefined, run ? '/api/run' : undefined)}
        className={`${base} ${look}`}
      >
        <Icon d={run ? 'M4 2.5v11l9-5.5z' : 'M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4'} />
        {label}
      </button>
      <span aria-live="polite" className="text-xs text-muted empty:hidden">
        {st.s === 'error' ? st.error : ''}
      </span>
    </span>
  )
}
