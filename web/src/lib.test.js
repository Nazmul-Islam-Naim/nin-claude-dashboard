import { describe, expect, it } from 'vitest'
import { barWidth, fmtPercent, fmtTokens, insightsUrl, feedUrl, filterProjects, findProject, isActive, pipelineUrl, progress, recentSessions, safeSheetUrl, unreadableCount } from './lib.js'

describe('lib', () => {
  it('progress = Built / (all - Rejected)', () => {
    expect(progress({ counts: { Extracted: 1, Confirmed: 1, 'Spec Written': 2, Built: 2, Rejected: 1 } })).toEqual({ done: 2, total: 6 })
    expect(progress({ counts: { 'Spec Written': 1 } })).toEqual({ done: 0, total: 1 })
    expect(progress(undefined)).toEqual({ done: 0, total: 0 })
  })
  it('url builders encode names', () => {
    expect(feedUrl('')).toBe('/api/feed')
    expect(feedUrl('a b/ñame')).toBe('/api/feed?project=' + encodeURIComponent('a b/ñame'))
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
  it('unreadableCount counts projects whose source is not sheet', () => {
    const mk = (source) => ({ requirements: { source } })
    expect(unreadableCount([mk('sheet'), mk('map'), mk('none')])).toBe(2)
    expect(unreadableCount(undefined)).toBe(0)
  })
  it('safeSheetUrl allows only Google Sheets https URLs', () => {
    const ok = 'https://docs.google.com/spreadsheets/d/abc/edit'
    expect(safeSheetUrl(ok)).toBe(ok)
    expect(safeSheetUrl('javascript:alert(1)')).toBeNull()
    expect(safeSheetUrl('https://evil.example.com/spreadsheets/')).toBeNull()
    expect(safeSheetUrl(undefined)).toBeNull()
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

import { afterEach, vi } from 'vitest'
import { openProjectRequest, runOpen } from './lib.js'

const resp = (status, body) => ({ ok: status < 400, json: async () => body })
describe('open (spec 013)', () => {
  afterEach(() => vi.useRealTimers())
  it('success posts JSON { project }', async () => {
    const f = vi.fn().mockResolvedValue(resp(200, { ok: true }))
    expect(await openProjectRequest('a', f)).toEqual({ ok: true })
    expect(f).toHaveBeenCalledWith('/api/open', expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"project":"a"}' }))
  })
  it('403/500 surfaces error text, fallback otherwise', async () => {
    expect(await openProjectRequest('a', async () => resp(403, { ok: false, error: 'nope' }))).toEqual({ ok: false, error: 'nope' })
    expect(await openProjectRequest('a', async () => resp(500, null))).toEqual({ ok: false, error: 'Could not open' })
  })
  it('network failure', async () => {
    expect(await openProjectRequest('a', async () => { throw new Error('x') })).toEqual({ ok: false, error: 'Could not open' })
  })
  it('timing: opening -> opened (2s) -> idle; error 4s', async () => {
    vi.useFakeTimers()
    const seen = []
    await runOpen('a', (v) => seen.push(v.s), async () => resp(200, { ok: true }))
    expect(seen).toEqual(['opening', 'opened'])
    vi.advanceTimersByTime(1999); expect(seen.at(-1)).toBe('opened')
    vi.advanceTimersByTime(1); expect(seen.at(-1)).toBe('idle')
    const e = []
    await runOpen('a', (v) => e.push(v.s), async () => resp(500, { error: 'x' }))
    vi.advanceTimersByTime(3999); expect(e.at(-1)).toBe('error')
    vi.advanceTimersByTime(1); expect(e.at(-1)).toBe('idle')
  })
})

describe('insights helpers', () => {
  it('insightsUrl with and without days', () => {
    expect(insightsUrl('a b')).toBe('/api/insights?project=a%20b')
    expect(insightsUrl('x', 7)).toBe('/api/insights?project=x&days=7')
    expect(insightsUrl('x', '')).toBe('/api/insights?project=x')
  })
  it('fmtPercent one decimal', () => {
    expect(fmtPercent(0)).toBe('0.0%')
    expect(fmtPercent(100)).toBe('100.0%')
    expect(fmtPercent(0.04)).toBe('0.0%')
    expect(fmtPercent(16.3)).toBe('16.3%')
  })
  it('fmtTokens groups digits', () => {
    expect(fmtTokens(0)).toBe('0')
    expect(fmtTokens(199590)).toBe('199,590')
  })
  it('barWidth keeps a minimum only above 0', () => {
    expect(barWidth(0)).toBe(0)
    expect(barWidth(0.1)).toBe(1)
    expect(barWidth(100)).toBe(100)
    expect(barWidth(43.2)).toBe(43.2)
  })
})

import { countByStatus, filterRequirements, limitList, PAGE } from './lib.js'
describe('requirement grid helpers', () => {
  const rows = [
    { id: 'R-1', title: 'Login Page', status: 'Built' },
    { id: 'R-2', title: 'Export', status: 'Extracted' },
    { id: 'X-3', title: 'login audit', status: 'Rejected' },
  ]
  it('countByStatus returns five counts', () => {
    expect(countByStatus(rows)).toEqual({ Extracted: 1, Confirmed: 0, 'Spec Written': 0, Built: 1, Rejected: 1 })
    expect(countByStatus()).toEqual({ Extracted: 0, Confirmed: 0, 'Spec Written': 0, Built: 0, Rejected: 0 })
  })
  it('filterRequirements by status and query', () => {
    expect(filterRequirements(rows, { status: 'All', query: '' })).toHaveLength(3)
    expect(filterRequirements(rows, { status: 'Built' })).toHaveLength(1)
    expect(filterRequirements(rows, { query: 'LOGIN' })).toHaveLength(2)
    expect(filterRequirements(rows, { query: 'x-3' })).toHaveLength(1)
    expect(filterRequirements(rows, { status: 'Built', query: 'export' })).toHaveLength(0)
  })
  it('limitList: first N and the rest; show more adds PAGE', () => {
    const l = Array.from({ length: 56 }, (_, i) => i)
    expect(limitList(l, PAGE)).toMatchObject({ rest: 32 })
    expect(limitList(l, PAGE).items).toHaveLength(24)
    expect(limitList(l, PAGE * 2)).toMatchObject({ rest: 8 })
    expect(limitList(l, PAGE * 3).rest).toBe(0)
  })
})

import { sendJson, serviceError, runningCount, pluginsUrl } from './lib.js'

describe('specs 021/022 helpers', () => {
  it('serviceError names owner', () => {
    expect(serviceError({ body: { error: 'port-busy', port: 3000, owner: { project: 'a' } } })).toBe('Port 3000 is used by project a')
    expect(serviceError({ body: { error: 'port-busy', port: 3000, owner: { external: true, pid: 9 } } })).toBe('Port 3000 is used by another program (pid 9)')
    expect(serviceError({ body: { error: 'port-taken', owner: { project: 'b' } } })).toBe('This port is already assigned to project b')
    expect(serviceError({ body: {} })).toBe('Request failed')
  })
  it('sendJson never throws and reports status', async () => {
    expect(await sendJson('PUT', '/x', {}, () => Promise.reject(new Error('x')))).toEqual({ ok: false, status: 0, body: {} })
    const r = await sendJson('POST', '/x', { a: 1 }, () => Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'port-busy' }) }))
    expect([r.ok, r.status, r.body.error]).toEqual([false, 409, 'port-busy'])
  })
  it('runningCount and pluginsUrl', () => {
    expect(runningCount({ services: [{ state: 'running' }, { state: 'stopped' }] })).toBe(1)
    expect(runningCount({})).toBe(0)
    expect(pluginsUrl('my proj')).toBe('/api/projects/my%20proj/plugins')
  })
})

import { serviceUrl, runningServices, faviconSvg, faviconHref, accentHex, pageTitle } from './lib.js'

describe('card status and favicon', () => {
  it('serviceUrl accepts only valid numeric ports', () => {
    expect(serviceUrl(3000)).toBe('http://localhost:3000')
    for (const bad of [null, undefined, '3000', 0, 70000, 3000.5, NaN]) expect(serviceUrl(bad)).toBeNull()
  })
  it('runningServices', () => {
    expect(runningServices({ services: [{ state: 'running' }, { state: 'stopped' }] })).toHaveLength(1)
    expect(runningServices({})).toEqual([])
  })
  it('favicon reflects accent, running dot and active ring', () => {
    const base = faviconSvg({ accent: '#d97757' })
    expect(base).toContain('fill="#d97757"')
    expect(base).not.toContain('#10b981')
    expect(faviconSvg({ running: true })).toContain('#10b981')
    expect(faviconSvg({ active: true })).toContain('stroke-opacity')
    expect(faviconHref({})).toMatch(/^data:image\/svg\+xml,%3Csvg/)
  })
  it('accentHex falls back to indigo; title shows running count', () => {
    expect(accentHex('clay')).toBe('#d97757')
    expect(accentHex('nope')).toBe('#4f46e5')
    expect(pageTitle(0)).toBe('Nin Dashboard')
    expect(pageTitle(2)).toBe('● 2 running · Nin Dashboard')
  })
})
