import { describe, expect, it } from 'vitest'
import { computeAnnualSunAccess } from './annualSunAccess'
import { prepareShadingScene } from './prepareShadingScene'

const METERS_PER_DEG = 111_319.49079327358

function metersToLonLat(xM: number, yM: number): [number, number] {
  return [xM / METERS_PER_DEG, yM / METERS_PER_DEG]
}

function makeScene(withBlockingObstacle = false) {
  const roofPolygon = [
    metersToLonLat(-2, -2),
    metersToLonLat(2, -2),
    metersToLonLat(2, 2),
    metersToLonLat(-2, 2),
  ] as Array<[number, number]>

  const scene = prepareShadingScene({
    gridResolutionM: 1,
    roofs: [
      {
        roofId: 'roof-1',
        polygon: roofPolygon,
        vertexHeightsM: [1, 1, 1, 1],
      },
    ],
    obstacles: withBlockingObstacle
      ? [
          {
            id: 'ob-1',
            kind: 'building',
            shape: 'prism' as const,
            polygon: roofPolygon,
            heightAboveGroundM: 12,
          },
        ]
      : [],
  })

  expect(scene).not.toBeNull()
  if (!scene) {
    throw new Error('Expected valid scene')
  }

  return scene
}

function makeSteepNorthFacingScene() {
  const roofPolygon = [
    metersToLonLat(-2, -2),
    metersToLonLat(2, -2),
    metersToLonLat(2, 2),
    metersToLonLat(-2, 2),
  ] as Array<[number, number]>

  const scene = prepareShadingScene({
    gridResolutionM: 1,
    roofs: [
      {
        roofId: 'roof-north',
        polygon: roofPolygon,
        vertexHeightsM: [12, 12, 0, 0],
      },
    ],
    obstacles: [],
  })

  expect(scene).not.toBeNull()
  if (!scene) {
    throw new Error('Expected valid scene')
  }

  return scene
}

describe('computeAnnualSunAccess', () => {
  it('returns deterministic full-sun metrics for unobstructed flat roof fixture', () => {
    const scene = makeScene(false)
    const result = computeAnnualSunAccess({
      scene,
      year: 2026,
      timeZone: 'UTC',
      halfYearMirror: true,
      sampleWindowDays: 20,
      stepMinutes: 90,
    })

    expect(result).not.toBeNull()
    if (!result) {
      return
    }

    expect(result.roofs).toHaveLength(1)
    expect(result.roofs[0]).toMatchObject({
      roofId: 'roof-1',
      sunHours: 3832.5,
      daylightHours: 3832.5,
      frontSideHours: 3832.5,
      litCellCountWeighted: 61320,
      totalCellCountWeighted: 61320,
      sunAccessRatio: 1,
    })

    expect(result.heatmapCells).toHaveLength(16)
    expect(result.heatmapCells.every((cell) => cell.litRatio === 1)).toBe(true)
    expect(result.meta).toEqual({
      sampledDayCount: 10,
      simulatedHalfYear: true,
      stepMinutes: 90,
      sampleWindowDays: 20,
      dateStartIso: '2026-01-01',
      dateEndIso: '2026-12-31',
    })
  })

  it('returns deterministic zero-sun metrics for fully blocked flat roof fixture', () => {
    const result = computeAnnualSunAccess({
      scene: makeScene(true),
      year: 2026,
      timeZone: 'UTC',
      halfYearMirror: true,
      sampleWindowDays: 20,
      stepMinutes: 90,
    })

    expect(result).not.toBeNull()
    if (!result) {
      return
    }

    expect(result.roofs).toHaveLength(1)
    expect(result.roofs[0]).toMatchObject({
      roofId: 'roof-1',
      sunHours: 0,
      daylightHours: 3832.5,
      frontSideHours: 3832.5,
      litCellCountWeighted: 0,
      totalCellCountWeighted: 61320,
      sunAccessRatio: 0,
    })
    expect(result.heatmapCells).toHaveLength(16)
    expect(result.heatmapCells.every((cell) => cell.litRatio === 0)).toBe(true)
  })

  it('produces deterministic outputs for mirrored-half-year and full-year fixtures', () => {
    const scene = makeScene(false)

    const mirrored = computeAnnualSunAccess({
      scene,
      year: 2026,
      timeZone: 'UTC',
      halfYearMirror: true,
      sampleWindowDays: 10,
      stepMinutes: 60,
    })

    const full = computeAnnualSunAccess({
      scene,
      year: 2026,
      timeZone: 'UTC',
      halfYearMirror: false,
      sampleWindowDays: 10,
      stepMinutes: 60,
    })

    expect(mirrored).not.toBeNull()
    expect(full).not.toBeNull()
    if (!mirrored || !full) {
      return
    }

    expect(mirrored.roofs[0].sunHours).toBe(4015)
    expect(mirrored.roofs[0].frontSideHours).toBe(4015)
    expect(mirrored.roofs[0].sunAccessRatio).toBe(1)
    expect(mirrored.meta.sampledDayCount).toBe(19)

    expect(full.roofs[0].sunHours).toBe(4015)
    expect(full.roofs[0].frontSideHours).toBe(4015)
    expect(full.roofs[0].sunAccessRatio).toBe(1)
    expect(full.meta.sampledDayCount).toBe(37)

    expect(mirrored.roofs[0].sunHours).toBe(full.roofs[0].sunHours)
    expect(mirrored.heatmapCells).toHaveLength(16)
    expect(full.heatmapCells).toHaveLength(16)
  })

  it('excludes all daylight when low-sun threshold is above all possible elevations', () => {
    const result = computeAnnualSunAccess({
      scene: makeScene(false),
      year: 2026,
      timeZone: 'UTC',
      halfYearMirror: false,
      sampleWindowDays: 30,
      stepMinutes: 120,
      lowSunElevationThresholdDeg: 95,
    })

    expect(result).not.toBeNull()
    if (!result) {
      return
    }

    expect(result.roofs[0]).toMatchObject({
      sunHours: 0,
      daylightHours: 0,
      frontSideHours: 0,
      litCellCountWeighted: 0,
      totalCellCountWeighted: 0,
      sunAccessRatio: 0,
    })
    expect(result.heatmapCells).toHaveLength(16)
    expect(result.heatmapCells.every((cell) => cell.litRatio === 0)).toBe(true)
    expect(result.meta.sampledDayCount).toBe(13)
  })

  it('supports deterministic explicit date-range simulation fixture', () => {
    const dateRange = computeAnnualSunAccess({
      scene: makeScene(false),
      dateStartIso: '2026-06-01',
      dateEndIso: '2026-06-30',
      timeZone: 'UTC',
      halfYearMirror: false,
      sampleWindowDays: 1,
      stepMinutes: 120,
    })

    expect(dateRange).not.toBeNull()
    if (!dateRange) {
      return
    }

    expect(dateRange.meta).toEqual({
      sampledDayCount: 30,
      simulatedHalfYear: false,
      stepMinutes: 120,
      sampleWindowDays: 1,
      dateStartIso: '2026-06-01',
      dateEndIso: '2026-06-30',
    })
    expect(dateRange.roofs[0]).toMatchObject({
      sunHours: 300,
      daylightHours: 300,
      frontSideHours: 300,
      litCellCountWeighted: 4800,
      totalCellCountWeighted: 4800,
      sunAccessRatio: 1,
    })
    expect(dateRange.heatmapCells).toHaveLength(16)
    expect(dateRange.heatmapCells.every((cell) => cell.litRatio === 1)).toBe(true)
  })

  it('does not count non-front-side daylight in denominator for north-facing winter fixture', () => {
    const result = computeAnnualSunAccess({
      scene: makeSteepNorthFacingScene(),
      dateStartIso: '2026-12-21',
      dateEndIso: '2026-12-21',
      timeZone: 'Europe/Warsaw',
      halfYearMirror: false,
      sampleWindowDays: 1,
      stepMinutes: 30,
      lowSunElevationThresholdDeg: 0,
    })

    expect(result).not.toBeNull()
    if (!result) {
      return
    }

    expect(result.roofs).toHaveLength(1)
    expect(result.roofs[0]).toMatchObject({
      roofId: 'roof-north',
      sunHours: 0,
      daylightHours: 12.5,
      frontSideHours: 0,
      litCellCountWeighted: 0,
      totalCellCountWeighted: 200,
      sunAccessRatio: 0,
    })
    expect(result.heatmapCells).toHaveLength(16)
    expect(result.heatmapCells.every((cell) => cell.litRatio === 0)).toBe(true)
  })

  it('returns identical deterministic outputs for repeated same-input simulation', () => {
    const scene = makeScene(false)
    const first = computeAnnualSunAccess({
      scene,
      dateStartIso: '2026-06-21',
      dateEndIso: '2026-06-21',
      timeZone: 'UTC',
      halfYearMirror: false,
      sampleWindowDays: 1,
      stepMinutes: 60,
    })
    const second = computeAnnualSunAccess({
      scene,
      dateStartIso: '2026-06-21',
      dateEndIso: '2026-06-21',
      timeZone: 'UTC',
      halfYearMirror: false,
      sampleWindowDays: 1,
      stepMinutes: 60,
    })

    expect(first).toEqual(second)
    expect(first?.roofs[0].sunHours).toBe(11)
    expect(first?.roofs[0].sunAccessRatio).toBe(1)
  })
})
