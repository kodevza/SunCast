import { useEffect, useMemo, useRef } from 'react'
import { computeSunProjection } from '../../geometry/sun/sunProjection'
import { parseIsoDateTimeWithTimezone } from '../../geometry/sun/sunPosition'
import { dateIsoInTimeZone, formatDateIsoLocal } from '../../shared/utils/dateIsoLocal'
import type { ProjectSunProjectionSettings, RoofPlane } from '../../types/geometry'

interface UseSunProjectionStateParams {
  sunProjection: ProjectSunProjectionSettings
  activeVertices: Array<[number, number]> | null
  activePlane: RoofPlane | null
  setSunProjectionDatetimeIso: (datetimeIso: string | null) => void
  setSunProjectionDailyDateIso: (dailyDateIso: string | null) => void
}

function computeFootprintCentroid(vertices: Array<[number, number]>): [number, number] {
  let lonSum = 0
  let latSum = 0
  for (const [lon, lat] of vertices) {
    lonSum += lon
    latSum += lat
  }
  return [lonSum / vertices.length, latSum / vertices.length]
}

function formatOffset(offsetMinutesWest: number): string {
  const offsetMinutesEast = -offsetMinutesWest
  const sign = offsetMinutesEast >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(offsetMinutesEast)
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0')
  const minutes = String(absoluteMinutes % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

function formatTimePart(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

function formatIsoDateTimeWithLocalOffset(date: Date): string {
  return `${formatDateIsoLocal(date)}T${formatTimePart(date)}${formatOffset(date.getTimezoneOffset())}`
}

function extractDateIsoInTimeZone(datetimeIso: string, timeZone: string): string | null {
  const parsed = parseIsoDateTimeWithTimezone(datetimeIso.trim())
  if (!parsed) {
    return null
  }
  return dateIsoInTimeZone(parsed, timeZone)
}

export function useSunProjectionState({
  sunProjection,
  activeVertices,
  activePlane,
  setSunProjectionDatetimeIso,
  setSunProjectionDailyDateIso,
}: UseSunProjectionStateParams) {
  const hasAppliedDefaultDatetimeRef = useRef(false)
  const sunDatetimeRaw = sunProjection.datetimeIso ?? ''
  const sunDailyTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const sunDatetimeParsed = sunDatetimeRaw.trim() === '' ? null : parseIsoDateTimeWithTimezone(sunDatetimeRaw.trim())
  const derivedSunDailyDateIso = useMemo(
    () => extractDateIsoInTimeZone(sunDatetimeRaw, sunDailyTimeZone),
    [sunDatetimeRaw, sunDailyTimeZone],
  )
  const sunDailyDateRaw = derivedSunDailyDateIso ?? ''
  const sunDatetimeError =
    sunDatetimeRaw.trim() === '' || sunDatetimeParsed ? null : 'Use ISO datetime with timezone, e.g. 2026-03-05T14:30:00+01:00'
  const hasValidSunDatetime = sunDatetimeParsed !== null

  useEffect(() => {
    if (hasAppliedDefaultDatetimeRef.current) {
      return
    }
    hasAppliedDefaultDatetimeRef.current = true

    if (sunProjection.datetimeIso) {
      return
    }

    const nowIso = formatIsoDateTimeWithLocalOffset(new Date())
    setSunProjectionDatetimeIso(nowIso)
    setSunProjectionDailyDateIso(extractDateIsoInTimeZone(nowIso, sunDailyTimeZone))
  }, [setSunProjectionDailyDateIso, setSunProjectionDatetimeIso, sunDailyTimeZone, sunProjection.datetimeIso])

  useEffect(() => {
    const persistedDailyDateIso = sunProjection.dailyDateIso ?? null
    const normalizedDailyDateIso = derivedSunDailyDateIso ?? null
    if (persistedDailyDateIso === normalizedDailyDateIso) {
      return
    }
    setSunProjectionDailyDateIso(normalizedDailyDateIso)
  }, [derivedSunDailyDateIso, setSunProjectionDailyDateIso, sunProjection.dailyDateIso])

  const activeFootprintCentroid = useMemo(
    () => (activeVertices && activeVertices.length > 0 ? computeFootprintCentroid(activeVertices) : null),
    [activeVertices],
  )

  const sunProjectionResult = useMemo(() => {
    if (!sunProjection.enabled || !hasValidSunDatetime || !activeFootprintCentroid || !activePlane) {
      return null
    }
    const [lon, lat] = activeFootprintCentroid
    try {
      return computeSunProjection({
        datetimeIso: sunDatetimeRaw.trim(),
        latDeg: lat,
        lonDeg: lon,
        plane: activePlane,
      })
    } catch {
      return null
    }
  }, [activeFootprintCentroid, activePlane, hasValidSunDatetime, sunDatetimeRaw, sunProjection.enabled])

  const onSunDatetimeInputChange = (rawDatetime: string) => {
    const trimmed = rawDatetime.trim()
    if (trimmed === '') {
      setSunProjectionDatetimeIso(null)
      setSunProjectionDailyDateIso(null)
      return
    }

    setSunProjectionDatetimeIso(trimmed)
    setSunProjectionDailyDateIso(extractDateIsoInTimeZone(trimmed, sunDailyTimeZone))
  }

  return {
    sunDatetimeRaw,
    sunDailyDateRaw,
    sunDailyTimeZone,
    sunDatetimeError,
    hasValidSunDatetime,
    sunProjectionResult,
    activeFootprintCentroid,
    onSunDatetimeInputChange,
  }
}
