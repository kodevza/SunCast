import { describe, expect, it } from 'vitest'
import { buildProjectedBinaryShadeOverlayGeometry } from './projectedBinaryShadeOverlay'
import type { ComputeRoofShadeGridResult } from '../../geometry/shading'

function metersToLonLat(xM: number, yM: number): [number, number] {
  const metersPerDegree = 111_319.49079327358
  return [xM / metersPerDegree, yM / metersPerDegree]
}

describe('buildProjectedBinaryShadeOverlayGeometry', () => {
  it('projects shaded cells onto the roof surface', () => {
    const shadeResult: ComputeRoofShadeGridResult = {
      status: 'OK',
      statusMessage: '',
      diagnostics: {
        roofsProcessed: 1,
        roofsSkipped: 0,
        obstaclesProcessed: 0,
        sampleCount: 1,
        obstacleCandidatesChecked: 0,
      },
      roofs: [
        {
          roofId: 'roof-1',
          shadeFactors: new Uint8Array([1]),
          cellPolygonPointCount: 3,
          cellPolygonLonLat: new Float64Array([
            ...metersToLonLat(1, 1),
            ...metersToLonLat(3, 1),
            ...metersToLonLat(2, 3),
          ]),
        },
      ],
    }

    const geometry = buildProjectedBinaryShadeOverlayGeometry(
      [
        {
          id: 'roof-1',
          vertices: [
            { lon: metersToLonLat(0, 0)[0], lat: metersToLonLat(0, 0)[1], z: 0 },
            { lon: metersToLonLat(4, 0)[0], lat: metersToLonLat(4, 0)[1], z: 0 },
            { lon: metersToLonLat(4, 4)[0], lat: metersToLonLat(4, 4)[1], z: 4 },
            { lon: metersToLonLat(0, 4)[0], lat: metersToLonLat(0, 4)[1], z: 4 },
          ],
          triangleIndices: [0, 1, 2, 0, 2, 3],
        },
      ],
      shadeResult,
      1,
    )

    expect(geometry).not.toBeNull()
    expect(geometry?.positions).toBeInstanceOf(Float32Array)
    expect(geometry?.indices).toBeInstanceOf(Uint32Array)
    expect(Array.from(geometry?.positions ?? []).filter((_, index) => index % 3 === 2).some((z) => z > 0)).toBe(true)
  })
})
