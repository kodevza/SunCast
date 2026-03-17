import { describe, expect, it } from 'vitest'
import { useActiveFootprintState } from './useActiveFootprintState'

describe('useActiveFootprintState', () => {
  it('returns precomputed values and applies adjustment to base pitch', () => {
    expect(
      useActiveFootprintState({
        activeFootprintErrors: ['invalid footprint'],
        activeFootprintCentroid: [21, 52],
        activePitchAdjustmentPercent: 10,
        basePitchDeg: 30,
      }),
    ).toEqual({
      activeFootprintErrors: ['invalid footprint'],
      activeFootprintCentroid: [21, 52],
      activePitchAdjustmentPercent: 10,
      adjustedPitchDeg: 33,
    })
  })

  it('returns null adjusted pitch when base pitch is unavailable', () => {
    expect(
      useActiveFootprintState({
        activeFootprintErrors: [],
        activeFootprintCentroid: null,
        activePitchAdjustmentPercent: 15,
        basePitchDeg: null,
      }),
    ).toEqual({
      activeFootprintErrors: [],
      activeFootprintCentroid: null,
      activePitchAdjustmentPercent: 15,
      adjustedPitchDeg: null,
    })
  })
})
