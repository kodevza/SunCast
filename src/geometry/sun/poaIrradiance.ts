const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

export interface PoaInput {
  dni_Wm2: number
  dhi_Wm2: number
  tiltDeg: number
  incidenceDeg: number
  sunElevationDeg: number
}

export interface PoaOutput {
  poaIrradiance_Wm2: number
  poaDirect_Wm2: number
  poaDiffuse_Wm2: number
  poaGroundReflected_Wm2: number
}

function clampCos(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function computePOA(input: PoaInput): PoaOutput {
  if (input.sunElevationDeg <= 0) {
    return {
      poaIrradiance_Wm2: 0,
      poaDirect_Wm2: 0,
      poaDiffuse_Wm2: 0,
      poaGroundReflected_Wm2: 0,
    }
  }

  const cosIncidence = clampCos(Math.cos(input.incidenceDeg * DEG_TO_RAD))
  const cosTilt = clampCos(Math.cos(input.tiltDeg * DEG_TO_RAD))

  const poaDirect = Math.max(0, input.dni_Wm2 * cosIncidence)
  const poaDiffuse = Math.max(0, input.dhi_Wm2 * (1 + cosTilt) * 0.5)
  const poaGroundReflected = 0

  return {
    poaIrradiance_Wm2: poaDirect + poaDiffuse + poaGroundReflected,
    poaDirect_Wm2: poaDirect,
    poaDiffuse_Wm2: poaDiffuse,
    poaGroundReflected_Wm2: poaGroundReflected,
  }
}

export function incidenceFromCos(cosIncidence: number): number {
  const clamped = Math.max(-1, Math.min(1, cosIncidence))
  return Math.acos(clamped) * RAD_TO_DEG
}
