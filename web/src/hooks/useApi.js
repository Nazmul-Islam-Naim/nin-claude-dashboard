import { useEffect, useState } from 'react'

export const POLL_MS = 5000

export function useApi(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let dead = false
    let timer
    setState({ data: null, loading: true, error: null })

    const tick = async () => {
      clearTimeout(timer)
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const data = await res.json()
        if (!dead) setState({ data, loading: false, error: null })
      } catch (e) {
        if (!dead) setState((s) => ({ ...s, loading: false, error: e.message || 'error' }))
      }
      if (!dead && !document.hidden) timer = setTimeout(tick, POLL_MS)
    }
    const onVis = () => { if (!document.hidden) tick(); else clearTimeout(timer) }

    document.addEventListener('visibilitychange', onVis)
    if (!document.hidden) tick()
    return () => { dead = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [url])

  return state
}
