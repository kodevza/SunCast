import { describe, expect, it } from 'vitest'
import type { FootprintPolygon } from '../../types/geometry'
import { prepareActiveFootprintGeometry } from './activeFootprintGeometry'

describe('prepareActiveFootprintGeometry', () => {
  it('returns neutral state when no active footprint is selected', () => {
    expect(prepareActiveFootprintGeometry(null)).toEqual({
      activeFootprintErrors: [],
      activeFootprintCentroid: null,
    })
  })

  it('returns validation errors and centroid for active footprint', () => {
    const activeFootprint: FootprintPolygon = {
      id: 'roof-1',
      vertices: [
        [20, 50],
        [22, 51],
      ],
      kwp: 5,
    }

    expect(prepareActiveFootprintGeometry(activeFootprint)).toEqual({
      activeFootprintErrors: ['Roof polygon must have at least 3 vertices'],
      activeFootprintCentroid: [21, 50.5],
    })
  })
})
