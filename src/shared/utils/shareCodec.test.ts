import { describe, expect, it } from 'vitest'
import { decodeSharePayload, encodeSharePayload } from './shareCodec'

describe('shareCodec', () => {
  it('encodes and decodes payload roundtrip', async () => {
    const raw = JSON.stringify({ version: 1, footprints: [{ id: 'a' }] })
    const encoded = await encodeSharePayload(raw)
    expect(encoded).not.toMatch(/[+/=]/)

    const decoded = await decodeSharePayload(encoded)
    expect(decoded).toBe(raw)
  })

  it('throws on corrupted payload', async () => {
    await expect(decodeSharePayload('bad!!!payload')).rejects.toThrow('Invalid shared URL payload')
  })
})
