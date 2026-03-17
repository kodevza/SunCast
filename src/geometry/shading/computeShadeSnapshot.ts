import { isPointShaded } from './shadeAtPoint'
import { computeMaxShadowDistanceM, sunDirectionFromAzimuthElevation } from './shadowProjection'
import { DEFAULT_LOW_SUN_THRESHOLD_DEG, DIRECT_SUN_FRONT_SIDE_EPSILON } from './constants'
import type { ComputeShadeSnapshotInput, ComputeShadeSnapshotResult } from './types'



function emptyDiagnostics() {
  return {
    roofsProcessed: 0,
    roofsSkipped: 0,
    obstaclesProcessed: 0,
    sampleCount: 0,
    obstacleCandidatesChecked: 0,
  }
}



function isRoofFrontSideLit(plane: { p: number; q: number }, sunDirection: { x: number; y: number; z: number }): boolean {
  const normalLength = Math.sqrt(plane.p * plane.p + plane.q * plane.q + 1)
  if (!Number.isFinite(normalLength) || normalLength <= 1e-9) {
    return false
  }

  const roofNormalX = -plane.p / normalLength
  const roofNormalY = -plane.q / normalLength
  const roofNormalZ = 1 / normalLength
  const cosIncidence = roofNormalX * sunDirection.x + roofNormalY * sunDirection.y + roofNormalZ * sunDirection.z

  return cosIncidence > DIRECT_SUN_FRONT_SIDE_EPSILON
}



export function computeShadeSnapshot(input: ComputeShadeSnapshotInput): ComputeShadeSnapshotResult {
  if (input.sunElevationDeg <= 0) {
    return {
      status: 'SUN_BELOW_HORIZON',
      statusMessage: 'Sun is below horizon for selected datetime',
      sunAzimuthDeg: input.sunAzimuthDeg,
      sunElevationDeg: input.sunElevationDeg,
      sunDirection: null,
      roofs: [],
      diagnostics: emptyDiagnostics(),
    }
  }

  const lowSunThresholdDeg =
    Number.isFinite(input.lowSunElevationThresholdDeg) && input.lowSunElevationThresholdDeg !== undefined
      ? input.lowSunElevationThresholdDeg
      : DEFAULT_LOW_SUN_THRESHOLD_DEG

  if (input.sunElevationDeg < lowSunThresholdDeg) {
    return {
      status: 'SUN_TOO_LOW',
      statusMessage: `Sun elevation ${input.sunElevationDeg.toFixed(2)} deg is below threshold`,
      sunAzimuthDeg: input.sunAzimuthDeg,
      sunElevationDeg: input.sunElevationDeg,
      sunDirection: null,
      roofs: [],
      diagnostics: emptyDiagnostics(),
    }
  }

  const maxShadowDistanceClampM =
    Number.isFinite(input.maxShadowDistanceClampM) && input.maxShadowDistanceClampM !== undefined
      ? input.maxShadowDistanceClampM
      : input.scene.maxShadowDistanceClampM

  const sunDirection = sunDirectionFromAzimuthElevation(input.sunAzimuthDeg, input.sunElevationDeg)
  const maxShadowDistanceM = computeMaxShadowDistanceM(input.scene.maxObstacleHeightM, input.sunElevationDeg, maxShadowDistanceClampM)

  const roofResults: ComputeShadeSnapshotResult['roofs'] = []
  for (const roof of input.scene.roofs) {
    const roofIsFrontSideLit = isRoofFrontSideLit(roof.surface.plane, sunDirection)
    if (!roofIsFrontSideLit) {
      roofResults.push({
        roofId: roof.roofId,
        isSunFacing: false,
        shadedCellCount: roof.samples.length,
        litCellCount: 0,
        shadeFactors: roof.samples.map(() => 1),
      })
      continue
    }

    let shadedCellCount = 0
    let litCellCount = 0

    const shadeFactors: Array<0 | 1> = roof.samples.map((sample) => {
      const shaded =
        roof.obstacleCandidates.length > 0 &&
        maxShadowDistanceM > 0 &&
        isPointShaded({
          sample,
          sunDirection,
          obstacles: roof.obstacleCandidates,
          maxShadowDistanceM,
        })

      if (shaded) {
        shadedCellCount += 1
        return 1
      }

      litCellCount += 1
      return 0
    })

    roofResults.push({
      roofId: roof.roofId,
      isSunFacing: true,
      shadedCellCount,
      litCellCount,
      shadeFactors,
    })
  }

  return {
    status: 'OK',
    statusMessage: 'Shading snapshot computed',
    sunAzimuthDeg: input.sunAzimuthDeg,
    sunElevationDeg: input.sunElevationDeg,
    sunDirection,
    roofs: roofResults,
    diagnostics: {
      ...input.scene.diagnostics,
    },
  }
}
