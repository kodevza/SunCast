import { describe, expect, it } from 'vitest'
import { buildObstacleGeometryCacheKey, buildRoofGeometryCacheKey } from './shadingCacheKey'

describe('buildRoofGeometryCacheKey', () => {
  it('serializes roof ids, polygon coordinates, and heights deterministically', () => {
    const key = buildRoofGeometryCacheKey([
      {
        roofId: 'roof-1',
        polygon: [
          [10.123456789, 20.123456789],
          [11, 21],
        ],
        vertexHeightsM: [1, 1.23456],
      },
    ])

    expect(key).toBe('roof-1|10.1234568,20.1234568;11.0000000,21.0000000|1.0000,1.2346')
  })
})

describe('buildObstacleGeometryCacheKey', () => {
  it('serializes prism and cylinder obstacles deterministically', () => {
    const key = buildObstacleGeometryCacheKey([
      {
        id: 'obs-1',
        kind: 'building',
        shape: 'prism',
        polygon: [
          [10.123456789, 20.123456789],
          [11, 21],
        ],
        heightAboveGroundM: 6.12345,
      },
      {
        id: 'obs-2',
        kind: 'tree',
        shape: 'cylinder',
        center: [9.123456789, 19.123456789],
        radiusM: 1.98765,
        heightAboveGroundM: 4.2,
      },
    ])

    expect(key).toBe(
      'obs-1|building|6.1235|prism|10.1234568,20.1234568;11.0000000,21.0000000||obs-2|tree|4.2000|cylinder|9.1234568,19.1234568|1.9876',
    )
  })
})
