const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

export interface SolarPosition {
  sunAzimuthDeg: number
  sunElevationDeg: number
}

function clampAzimuth(azimuthDeg: number): number {
  let normalized = azimuthDeg % 360
  if (normalized < 0) {
    normalized += 360
  }
  return normalized
}

function isIsoWithTimezone(iso: string): boolean {
  return /(Z|[+-]\d{2}:\d{2})$/i.test(iso)
}

export function parseIsoDateTimeWithTimezone(iso: string): Date | null {
  if (!isIsoWithTimezone(iso)) {
    return null
  }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

function dayOfYearUtc(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((current - start) / 86_400_000)
}

// NOAA-style approximation for apparent solar position.
export function computeSolarPosition(datetimeIso: string, latDeg: number, lonDeg: number): SolarPosition {
  const date = parseIsoDateTimeWithTimezone(datetimeIso)
  if (!date) {
    throw new Error('Datetime must be an ISO string with timezone offset')
  }

  const n = dayOfYearUtc(date)
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60

  const gamma = (2 * Math.PI / 365) * (n - 1 + (utcMinutes - 720) / 1440)

  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))

  const declinationRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  const trueSolarTimeMin = (utcMinutes + eqTimeMin + 4 * lonDeg + 1440) % 1440
  const hourAngleDeg = trueSolarTimeMin / 4 - 180
  const hourAngleRad = hourAngleDeg * DEG_TO_RAD

  const latRad = latDeg * DEG_TO_RAD
  const cosZenith =
    Math.sin(latRad) * Math.sin(declinationRad) +
    Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad)
  const clampedCosZenith = Math.max(-1, Math.min(1, cosZenith))
  const zenithRad = Math.acos(clampedCosZenith)
  const elevationDeg = 90 - zenithRad * RAD_TO_DEG

  const sinAzimuth = -(Math.sin(hourAngleRad) * Math.cos(declinationRad)) / Math.max(1e-8, Math.sin(zenithRad))
  const cosAzimuth =
    (Math.sin(declinationRad) - Math.sin(latRad) * Math.cos(zenithRad)) /
    Math.max(1e-8, Math.cos(latRad) * Math.sin(zenithRad))
  const azimuthRad = Math.atan2(sinAzimuth, cosAzimuth)

  return {
    sunAzimuthDeg: clampAzimuth(azimuthRad * RAD_TO_DEG),
    sunElevationDeg: elevationDeg,
  }
}
