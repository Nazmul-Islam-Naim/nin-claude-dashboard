import { useEffect, useRef, useState } from 'react'
import { runOpen } from '../lib.js'

export default function OpenButton({ project, className = '' }) {
  const [st, setSt] = useState({ s: 'idle' })
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  const set = (v) => alive.current && setSt(v)
  const label = { idle: 'VS Code-এ খুলুন', opening: 'খুলছে…', opened: 'খোলা হয়েছে', error: 'VS Code-এ খুলুন' }[st.s]
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={st.s === 'opening'}
        aria-label={`VS Code-এ খুলুন (${project})`}
        onClick={() => runOpen(project, set)}
        className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-primary hover:border-primary disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {label}
      </button>
      <span aria-live="polite" className="text-xs text-muted">
        {st.s === 'opened' ? 'খোলা হয়েছে' : st.s === 'error' ? st.error : ''}
      </span>
    </span>
  )
}
