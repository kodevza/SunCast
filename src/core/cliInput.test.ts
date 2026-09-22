import { describe, expect, it } from 'vitest'
import { createForecastCliInput } from './cliInput'

const roof = {
  footprintId: 'roof-1',
  latDeg: 52.23,
  lonDeg: 21.01,
  kwp: 6.5,
  roofPitchDeg: 35,
  roofAzimuthDeg: 180,
  roofPlane: { p: 0.2, q: 0.1, r: 5 },
}

describe('createForecastCliInput', () => {
  it('creates the serializable CLI contract from solved roof inputs', () => {
    expect(createForecastCliInput([roof], '2026-03-07T12:30:00.000Z')).toEqual({
      createdDateTime: '2026-03-07T12:30:00.000Z',
      roofs: [roof],
    })
  })

  it('rejects a missing date or solved roof selection', () => {
    expect(() => createForecastCliInput([roof], '2026-03-07')).toThrow('createdDateTime')
    expect(() => createForecastCliInput([], '2026-03-07T12:30:00.000Z')).toThrow('At least one solved roof')
  })
})
