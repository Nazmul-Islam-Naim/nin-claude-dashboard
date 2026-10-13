import { useEffect, useState } from 'react'
import { accentHex, faviconHref, pageTitle } from '../lib.js'

const KEY = 'nin-accent'
const read = () => { try { return localStorage.getItem(KEY) || 'indigo' } catch { return 'indigo' } }

// Accent colour (saved per browser) drives --color-primary and the favicon.
export function useAccent() {
  const [accent, set] = useState(read)
  useEffect(() => { document.documentElement.style.setProperty('--color-primary', accentHex(accent)) }, [accent])
  const setAccent = (id) => { set(id); try { localStorage.setItem(KEY, id) } catch {} }
  return [accent, setAccent]
}

// Live favicon + tab title. Polls on its own (not paused in background tabs, the tab icon is exactly what you see then).
export function useLiveFavicon(accent, ms = 8000) {
  const [live, setLive] = useState({ running: 0, active: false })
  useEffect(() => {
    let dead = false
    const tick = async () => {
      try {
        const d = await (await fetch('/api/projects')).json()
        const ps = d.projects || []
        if (!dead) setLive({ running: ps.reduce((n, p) => n + (p.services || []).filter((s) => s.state === 'running').length, 0), active: ps.some((p) => p.active) })
      } catch {}
    }
    tick()
    const t = setInterval(tick, ms)
    window.addEventListener('dashboard:refresh', tick)
    return () => { dead = true; clearInterval(t); window.removeEventListener('dashboard:refresh', tick) }
  }, [ms])
  useEffect(() => {
    let link = document.querySelector('link[rel="icon"]')
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.type = 'image/svg+xml'
    link.href = faviconHref({ accent: accentHex(accent), running: live.running > 0, active: live.active })
    document.title = pageTitle(live.running)
  }, [accent, live])
}
