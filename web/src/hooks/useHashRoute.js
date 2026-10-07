import { useSyncExternalStore } from 'react'

export function parseHash(hash) {
  const [, tab, rest] = (hash || '').match(/^#\/([^/]*)(?:\/(.+))?$/) || []
  if (tab === 'feed' || tab === 'pipeline') return { tab, project: null }
  if (tab === 'projects' && rest) {
    try { return { tab: 'projects', project: decodeURIComponent(rest) } } catch { /* fall through */ }
  }
  return { tab: 'projects', project: null }
}

const subscribe = (cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }

export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parseHash(hash)
}
