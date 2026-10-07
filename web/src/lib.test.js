import { describe, expect, it } from 'vitest'
import { feedUrl, filterProjects, findProject, isActive, pipelineUrl, progress, recentSessions, unreadableCount } from './lib.js'

describe('lib', () => {
  it('progress = Spec Written / (all - Rejected)', () => {
    expect(progress({ counts: { Extracted: 1, Confirmed: 1, 'Spec Written': 2, Rejected: 1 } })).toEqual({ done: 2, total: 4 })
  })
  it('url builders encode names', () => {
    expect(feedUrl('')).toBe('/api/feed')
    expect(feedUrl('a b/বাংলা')).toBe('/api/feed?project=' + encodeURIComponent('a b/বাংলা'))
    expect(pipelineUrl('x y')).toBe('/api/pipeline?project=x%20y')
    expect(pipelineUrl('')).toBe('/api/pipeline')
  })
  it('isActive uses activeMinutes window', () => {
    const now = Date.parse('2026-10-05T10:00:00Z')
    expect(isActive('2026-10-05T09:56:00Z', 5, now)).toBe(true)
    expect(isActive('2026-10-05T09:50:00Z', 5, now)).toBe(false)
  })
  it('filterProjects', () => {
    const ps = [{ active: true }, { active: false }, { active: false }]
    expect(filterProjects(ps, 'all')).toHaveLength(3)
    expect(filterProjects(ps, 'active')).toHaveLength(1)
    expect(filterProjects(ps, 'idle')).toHaveLength(2)
  })
  it('unreadableCount counts non-ok sheets', () => {
    const mk = (status) => ({ requirements: { status } })
    expect(unreadableCount([mk('ok'), mk('error'), mk('no-sheet')])).toBe(2)
    expect(unreadableCount(undefined)).toBe(0)
  })
  it('findProject and recentSessions (sorted, capped at 50)', () => {
    expect(findProject({ projects: [{ name: 'a' }, { name: 'b' }] }, 'b')).toEqual({ name: 'b' })
    expect(findProject(null, 'b')).toBeUndefined()
    const list = Array.from({ length: 60 }, (_, i) => ({ sessionId: i, lastActivity: new Date(i * 1000).toISOString() }))
    const out = recentSessions(list)
    expect(out).toHaveLength(50)
    expect(out[0].sessionId).toBe(59)
  })
})
