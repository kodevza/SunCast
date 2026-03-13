import { describe, expect, it } from 'vitest'
import { decodeSharePayload, decodeSharePayloadResult, encodeSharePayload } from './shareCodec'

describe('shareCodec', () => {
  it('encodes and decodes payload roundtrip', async () => {
    const raw = JSON.stringify({ version: 1, footprints: [{ id: 'a' }] })
    const encoded = await encodeSharePayload(raw)
    expect(encoded).not.toMatch(/[+/=]/)

    const decoded = await decodeSharePayload(encoded)
    expect(decoded).toBe(raw)
  })

  it('throws on corrupted payload', async () => {
    await expect(decodeSharePayload('bad!!!payload')).rejects.toThrow('Invalid shared URL payload.')
  })

  it('returns typed error from Result API on corrupted payload', async () => {
    const result = await decodeSharePayloadResult('bad!!!payload')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.error.code).toBe('SHARE_PAYLOAD_INVALID')
    expect(result.error.severity).toBe('warning')
    expect(result.error.recoverable).toBe(true)
    expect(result.error.context?.enableStateReset).toBe(true)
  })
})
