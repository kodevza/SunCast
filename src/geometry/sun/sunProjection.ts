import type { RoofPlane } from '../../types/geometry'
import { computeClearSkyIrradiance } from './clearSky'
import { computePOA, incidenceFromCos } from './poaIrradiance'
import { computeSolarPosition } from './sunPosition'

const DEG_TO_RAD = Math.PI / 180

export interface SunProjectionInput {
  datetimeIso: string
  latDeg: number
  lonDeg: number
  plane: RoofPlane
}

export interface SunProjectionResult {
  sunAzimuthDeg: number
  sunElevationDeg: number
  incidenceDeg: number
  cosIncidence: number
  poaIrradiance_Wm2: number
  poaDirect_Wm2: number
  poaDiffuse_Wm2: number
  poaGroundReflected_Wm2: number
}

function clampCos(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function computeTiltDegFromPlane(plane: RoofPlane): number {
  const slopeMagnitude = Math.sqrt(plane.p * plane.p + plane.q * plane.q)
  return Math.atan(slopeMagnitude) * (180 / Math.PI)
}

export function computeSunProjection(input: SunProjectionInput): SunProjectionResult {
  const solar = computeSolarPosition(input.datetimeIso, input.latDeg, input.lonDeg)
  const clearSky = computeClearSkyIrradiance(input.datetimeIso, solar.sunElevationDeg)

  const sunAzRad = solar.sunAzimuthDeg * DEG_TO_RAD
  const sunElRad = solar.sunElevationDeg * DEG_TO_RAD
  const sunVector = {
    x: Math.sin(sunAzRad) * Math.cos(sunElRad),
    y: Math.cos(sunAzRad) * Math.cos(sunElRad),
    z: Math.sin(sunElRad),
  }

  const normalLength = Math.sqrt(input.plane.p * input.plane.p + input.plane.q * input.plane.q + 1)
  const roofNormal = {
    x: -input.plane.p / normalLength,
    y: -input.plane.q / normalLength,
    z: 1 / normalLength,
  }

  const cosIncidence = clampCos(
    roofNormal.x * sunVector.x + roofNormal.y * sunVector.y + roofNormal.z * sunVector.z,
  )
  const incidenceDeg = incidenceFromCos(cosIncidence)
  const tiltDeg = computeTiltDegFromPlane(input.plane)

  const poa = computePOA({
    dni_Wm2: clearSky.dniClear_Wm2,
    dhi_Wm2: clearSky.dhiClear_Wm2,
    tiltDeg,
    incidenceDeg,
    sunElevationDeg: solar.sunElevationDeg,
  })

  return {
    sunAzimuthDeg: solar.sunAzimuthDeg,
    sunElevationDeg: solar.sunElevationDeg,
    incidenceDeg,
    cosIncidence,
    poaIrradiance_Wm2: poa.poaIrradiance_Wm2,
    poaDirect_Wm2: poa.poaDirect_Wm2,
    poaDiffuse_Wm2: poa.poaDiffuse_Wm2,
    poaGroundReflected_Wm2: poa.poaGroundReflected_Wm2,
  }
}
