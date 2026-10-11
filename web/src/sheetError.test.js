import { describe, it, expect } from 'vitest'
import { sheetErrorText, reqMessage } from './components/ReqSummary.jsx'

describe('sheetErrorText', () => {
  it('turns server errors into actions', () => {
    expect(sheetErrorText('no key path configured')).toMatch(/Select Google Key File/)
    expect(sheetErrorText('key file missing or unreadable')).toMatch(/not found/)
    expect(sheetErrorText('Sheets request failed (HTTP 403)')).toMatch(/not shared/)
    expect(sheetErrorText('network or parse error')).toBe('Could not read Sheet')
    expect(sheetErrorText()).toBe('Could not read Sheet')
  })
  it('is used for error requirements', () => {
    expect(reqMessage({ status: 'error', error: 'Sheets request failed (HTTP 404)' })).toMatch(/not shared/)
  })
})
