import { computeSolarPosition } from '../sun/sunPosition'
import { localMetersToLonLat, type LocalOrigin } from '../projection/localMeters'
import { computeShadeSnapshot } from './computeShadeSnapshot'
import { prepareShadingScene } from './prepareShadingScene'
import type { ComputeRoofShadeGridInput, ComputeRoofShadeGridResult } from './types'



function emptyDiagnostics() {
  return {
    roofsProcessed: 0,
    roofsSkipped: 0,
    obstaclesProcessed: 0,
    sampleCount: 0,
    obstacleCandidatesChecked: 0,
  }
}

function writeCellPolygonLonLat(
  target: Float64Array,
  targetOffset: number,
  origin: LocalOrigin,
  polygonLocal: ReadonlyArray<{ x: number; y: number }>,
): void {
  let writeIndex = targetOffset
  for (const point of polygonLocal) {
    const [lon, lat] = localMetersToLonLat(origin, point)
    target[writeIndex] = lon
    target[writeIndex + 1] = lat
    writeIndex += 2
  }
}



function toStatusResult(
  status: ComputeRoofShadeGridResult['status'],
  statusMessage: string,
  partial?: Partial<ComputeRoofShadeGridResult>,
): ComputeRoofShadeGridResult {
  return {
    status,
    statusMessage,
    roofs: partial?.roofs ?? [],
    diagnostics: partial?.diagnostics ?? emptyDiagnostics(),
  }
}



export function computeRoofShadeGrid(input: ComputeRoofShadeGridInput): ComputeRoofShadeGridResult {
  if (!Number.isFinite(input.gridResolutionM) || input.gridResolutionM <= 0) {
    return toStatusResult('INVALID_GRID_RESOLUTION', 'Grid resolution must be a positive finite number')
  }

  if (input.roofs.length === 0) {
    return toStatusResult('NO_ROOFS', 'No roofs selected for shading computation')
  }

  const scene = prepareShadingScene({
    roofs: input.roofs,
    obstacles: input.obstacles,
    gridResolutionM: input.gridResolutionM,
    maxSampleCount: input.maxSampleCount,
    sampleOverflowStrategy: input.sampleOverflowStrategy,
    maxShadowDistanceClampM: input.maxShadowDistanceClampM,
  })

  if (!scene || scene.roofs.length === 0) {
    return toStatusResult('NO_ROOFS', 'No roof geometry available for shading computation')
  }

  const solar = computeSolarPosition(input.datetimeIso, scene.origin.lat0, scene.origin.lon0)
  const snapshot = computeShadeSnapshot({
    scene,
    sunAzimuthDeg: solar.sunAzimuthDeg,
    sunElevationDeg: solar.sunElevationDeg,
    lowSunElevationThresholdDeg: input.lowSunElevationThresholdDeg,
    maxShadowDistanceClampM: input.maxShadowDistanceClampM,
  })

  if (snapshot.status !== 'OK') {
    return toStatusResult(snapshot.status, snapshot.statusMessage, {
      diagnostics: snapshot.diagnostics,
    })
  }

  const roofs: ComputeRoofShadeGridResult['roofs'] = scene.roofs.map((roof, roofIndex) => {
    const roofSnapshot = snapshot.roofs[roofIndex]
    const sampleCount = roof.samples.length
    const cellPolygonPointCount = roof.samples[0]?.cellPolygonLocal.length ?? 0
    const shadeFactors = new Uint8Array(sampleCount)
    const cellPolygonLonLat = new Float64Array(sampleCount * cellPolygonPointCount * 2)

    if (sampleCount === 0 || cellPolygonPointCount === 0) {
      return {
        roofId: roof.roofId,
        shadeFactors,
        cellPolygonPointCount,
        cellPolygonLonLat,
      }
    }

    for (let index = 0; index < sampleCount; index += 1) {
      const sample = roof.samples[index]
      const shadeFactor = roofSnapshot?.shadeFactors[index] ?? 0
      shadeFactors[index] = shadeFactor
      writeCellPolygonLonLat(cellPolygonLonLat, index * cellPolygonPointCount * 2, scene.origin, sample.cellPolygonLocal)
    }

    return {
      roofId: roof.roofId,
      shadeFactors,
      cellPolygonPointCount,
      cellPolygonLonLat,
    }
  })

  return toStatusResult('OK', 'Shading grid computed', {
    roofs,
    diagnostics: snapshot.diagnostics,
  })
}
