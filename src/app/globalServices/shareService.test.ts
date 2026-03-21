// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearShareHashPayloadFromLocation, readSharedStateFromHashResult } from './shareService'

const mockDecodeSharePayloadResult = vi.fn()
const mockDeserializeSharePayloadResult = vi.fn()

vi.mock('../../shared/utils/shareCodec', () => ({
  decodeSharePayloadResult: (...args: unknown[]) => mockDecodeSharePayloadResult(...args),
}))

vi.mock('../../state/project-store/projectState.share', () => ({
  deserializeSharePayloadResult: (...args: unknown[]) => mockDeserializeSharePayloadResult(...args),
}))

const DEFAULT_SUN = { enabled: true, datetimeIso: null, dailyDateIso: null, dateStartIso: null, dateEndIso: null }
const DEFAULT_SHADING = { enabled: true, gridResolutionM: 0.5 }
const DEFAULT_KWP = 4.3

describe('shareService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('returns ok(null) when hash does not include c payload', async () => {
    const result = await readSharedStateFromHashResult('#foo=bar', DEFAULT_SUN, DEFAULT_KWP, DEFAULT_SHADING)

    expect(result).toEqual({ ok: true, value: null })
    expect(mockDecodeSharePayloadResult).not.toHaveBeenCalled()
    expect(mockDeserializeSharePayloadResult).not.toHaveBeenCalled()
  })

  it('decodes and deserializes c payload from hash', async () => {
    const shared = { activeFootprintId: 'a' }
    mockDecodeSharePayloadResult.mockResolvedValue({ ok: true, value: '{"schemaVersion":3}' })
    mockDeserializeSharePayloadResult.mockReturnValue({ ok: true, value: shared })

    const result = await readSharedStateFromHashResult('#c=abc', DEFAULT_SUN, DEFAULT_KWP, DEFAULT_SHADING)

    expect(mockDecodeSharePayloadResult).toHaveBeenCalledWith('abc')
    expect(mockDeserializeSharePayloadResult).toHaveBeenCalledWith(
      '{"schemaVersion":3}',
      DEFAULT_SUN,
      DEFAULT_KWP,
      DEFAULT_SHADING,
    )
    expect(result).toEqual({ ok: true, value: shared })
  })

  it('returns decode error when payload cannot be decoded', async () => {
    const decodeError = { code: 'SHARE_PAYLOAD_INVALID', message: 'Invalid shared URL payload.' }
    mockDecodeSharePayloadResult.mockResolvedValue({ ok: false, error: decodeError })

    const result = await readSharedStateFromHashResult('c=broken', DEFAULT_SUN, DEFAULT_KWP, DEFAULT_SHADING)

    expect(result).toEqual({ ok: false, error: decodeError })
    expect(mockDeserializeSharePayloadResult).not.toHaveBeenCalled()
  })

  it('removes c payload from hash while preserving other hash params', () => {
    window.history.replaceState({}, '', '/?x=1#c=abc&mode=draw')

    clearShareHashPayloadFromLocation(window.location)

    expect(window.location.pathname).toBe('/')
    expect(window.location.search).toBe('?x=1')
    expect(window.location.hash).toBe('#mode=draw')
  })

  it('does nothing when hash does not contain c payload', () => {
    window.history.replaceState({}, '', '/?x=1#mode=draw')

    clearShareHashPayloadFromLocation(window.location)

    expect(window.location.pathname).toBe('/')
    expect(window.location.search).toBe('?x=1')
    expect(window.location.hash).toBe('#mode=draw')
  })
})
