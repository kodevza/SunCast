const SOLAR_CONSTANT_WM2 = 1361
const DEG_TO_RAD = Math.PI / 180

export interface ClearSkyIrradiance {
  dniClear_Wm2: number
  dhiClear_Wm2: number
}

function dayOfYearUtc(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((current - start) / 86_400_000)
}

function earthOrbitCorrection(dayOfYear: number): number {
  return 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365)
}

function relativeAirMass(sunElevationDeg: number): number {
  const elevationSafe = Math.max(-5, sunElevationDeg)
  const sinEl = Math.sin(Math.max(0, sunElevationDeg) * DEG_TO_RAD)
  if (sinEl <= 0) {
    return Number.POSITIVE_INFINITY
  }
  return 1 / (sinEl + 0.50572 * Math.pow(6.07995 + elevationSafe, -1.6364))
}

// Deterministic minimal clear-sky model (MVP): no weather/API dependency.
export function computeClearSkyIrradiance(datetimeIso: string, sunElevationDeg: number): ClearSkyIrradiance {
  if (sunElevationDeg <= 0) {
    return { dniClear_Wm2: 0, dhiClear_Wm2: 0 }
  }

  const date = new Date(datetimeIso)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid datetime ISO')
  }

  const n = dayOfYearUtc(date)
  const e0 = earthOrbitCorrection(n)
  const airMass = relativeAirMass(sunElevationDeg)
  const directTransmittance = Math.pow(0.7, Math.pow(airMass, 0.678))

  const dniClear = Math.max(0, SOLAR_CONSTANT_WM2 * e0 * directTransmittance)
  const sinEl = Math.sin(sunElevationDeg * DEG_TO_RAD)
  const dhiClear = Math.max(0, 0.12 * dniClear * sinEl + 18 * sinEl)

  return {
    dniClear_Wm2: dniClear,
    dhiClear_Wm2: dhiClear,
  }
}
