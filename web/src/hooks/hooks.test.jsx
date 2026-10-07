import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApi } from './useApi.js'
import { parseHash, useHashRoute } from './useHashRoute.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function renderHook(hook, arg) {
  const out = { current: null }
  const C = () => { out.current = hook(arg); return null }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(createElement(C)))
  return { out, unmount: () => act(() => root.unmount()) }
}
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })
const ok = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) })

describe('useApi', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('loading only until first response; failed poll keeps data and sets error', async () => {
    const f = vi.fn().mockReturnValueOnce(ok({ n: 1 })).mockImplementationOnce(() => Promise.reject(new Error('boom')))
    vi.stubGlobal('fetch', f)
    const { out, unmount } = renderHook(useApi, '/api/x')
    expect(out.current.loading).toBe(true)
    await flush()
    expect(out.current).toEqual({ data: { n: 1 }, loading: false, error: null })
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(f).toHaveBeenCalledTimes(2)
    expect(out.current.data).toEqual({ n: 1 })
    expect(out.current.loading).toBe(false)
    expect(out.current.error).toBe('boom')
    unmount()
  })

  it('pauses while hidden, fetches immediately when visible', async () => {
    const f = vi.fn(() => ok({}))
    vi.stubGlobal('fetch', f)
    const { unmount } = renderHook(useApi, '/api/x')
    await flush()
    let hidden = true
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    document.dispatchEvent(new Event('visibilitychange'))
    await act(async () => { await vi.advanceTimersByTimeAsync(20000) })
    expect(f).toHaveBeenCalledTimes(1)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(f).toHaveBeenCalledTimes(2)
    unmount()
  })
})

describe('useHashRoute', () => {
  it('parseHash falls back to projects', () => {
    expect(parseHash('#/feed')).toEqual({ tab: 'feed', project: null })
    expect(parseHash('#/pipeline')).toEqual({ tab: 'pipeline', project: null })
    expect(parseHash('#/nope')).toEqual({ tab: 'projects', project: null })
    expect(parseHash('')).toEqual({ tab: 'projects', project: null })
    expect(parseHash('#/projects/a%20b')).toEqual({ tab: 'projects', project: 'a b' })
  })
  it('reacts to hashchange', () => {
    location.hash = '#/feed'
    const { out, unmount } = renderHook(useHashRoute)
    expect(out.current.tab).toBe('feed')
    act(() => { location.hash = '#/pipeline'; window.dispatchEvent(new Event('hashchange')) })
    expect(out.current.tab).toBe('pipeline')
    unmount()
  })
})
