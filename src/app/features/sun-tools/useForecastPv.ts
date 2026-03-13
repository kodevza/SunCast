import { useEffect, useMemo, useRef, useState } from 'react'
import type { SelectedRoofSunInput } from './SunOverlayColumn'
import { fetchOpenMeteoTiltedIrradiance } from './forecast/openMeteoForecast'
import { createRoofForecastProfile, mergeSettledRoofForecasts, type ForecastPoint } from './forecast/forecastPvTransform'
import { extractDateIsoInTimeZone } from './sunDateTime'
import { captureException, recordEvent } from '../../../shared/observability/observability'
import { reportAppErrorCode, startGlobalProcessingToast, stopGlobalProcessingToast } from '../../../shared/errors'

const FORECAST_TIME_ZONE = 'UTC'

interface UseForecastPvArgs {
  datetimeIso: string
  selectedRoofs: SelectedRoofSunInput[]
  computationEnabled?: boolean
}

interface UseForecastPvResult {
  selectedDateIso: string | null
  selectedCount: number
  hasForecastInputs: boolean
  isForecastLoading: boolean
  forecastError: string | null
  forecastPoints: ForecastPoint[]
  totalSelectedKwp: number
}

export function useForecastPv({
  datetimeIso,
  selectedRoofs,
  computationEnabled = true,
}: UseForecastPvArgs): UseForecastPvResult {
  const [isForecastLoading, setIsForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [forecastPoints, setForecastPoints] = useState<ForecastPoint[]>([])
  const lastReportedErrorRef = useRef<string | null>(null)

  const selectedDateIso = useMemo(() => extractDateIsoInTimeZone(datetimeIso, FORECAST_TIME_ZONE), [datetimeIso])
  const selectedCount = selectedRoofs.length
  const hasForecastInputs = computationEnabled && selectedDateIso !== null && selectedCount > 0

  const totalSelectedKwp = useMemo(
    () => selectedRoofs.reduce((sum, roof) => sum + (Number.isFinite(roof.kwp) && roof.kwp > 0 ? roof.kwp : 0), 0),
    [selectedRoofs],
  )

  useEffect(() => {
    if (!hasForecastInputs || !selectedDateIso || selectedRoofs.length === 0) {
      return
    }

    const abortController = new AbortController()
    queueMicrotask(() => {
      if (abortController.signal.aborted) {
        return
      }
      setIsForecastLoading(true)
      setForecastError(null)
    })

    Promise.allSettled(
      selectedRoofs.map(async (roof) => {
        const samples = await fetchOpenMeteoTiltedIrradiance({
          latDeg: roof.latDeg,
          lonDeg: roof.lonDeg,
          roofPitchDeg: roof.roofPitchDeg,
          roofAzimuthDeg: roof.roofAzimuthDeg,
          timeZone: FORECAST_TIME_ZONE,
          dateIso: selectedDateIso,
          signal: abortController.signal,
        })
        return createRoofForecastProfile(samples, selectedDateIso, roof.kwp)
      }),
    )
      .then((results) => {
        const merged = mergeSettledRoofForecasts(results)
        setForecastPoints(merged.points)

        if (merged.succeededRoofCount === 0 && merged.failedRoofCount > 0) {
          const message = 'Forecast unavailable for all selected polygons.'
          setForecastError(message)
          if (lastReportedErrorRef.current !== message) {
            reportAppErrorCode('FORECAST_FAILED', message, {
              context: { area: 'forecast-hook', failedRoofCount: merged.failedRoofCount, mode: 'all' },
            })
            lastReportedErrorRef.current = message
          }
          recordEvent('forecast.unavailable_all', { failedRoofCount: merged.failedRoofCount })
          return
        }

        if (merged.failedRoofCount > 0) {
          const message = `Forecast unavailable for ${merged.failedRoofCount} selected polygon(s).`
          setForecastError(message)
          if (lastReportedErrorRef.current !== message) {
            reportAppErrorCode('FORECAST_FAILED', message, {
              context: { area: 'forecast-hook', failedRoofCount: merged.failedRoofCount, mode: 'partial', enableStateReset: true },
            })
            lastReportedErrorRef.current = message
          }
          recordEvent('forecast.unavailable_partial', { failedRoofCount: merged.failedRoofCount })
          return
        }

        setForecastError(null)
        lastReportedErrorRef.current = null
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setForecastPoints([])
        const message = error instanceof Error ? error.message : 'Unknown forecast API error'
        setForecastError(message)
        if (lastReportedErrorRef.current !== message) {
          reportAppErrorCode('FORECAST_FAILED', message, {
            cause: error,
            context: { area: 'forecast-hook', mode: 'exception', enableStateReset: true },
          })
          lastReportedErrorRef.current = message
        }
        captureException(error, { area: 'forecast-hook' })
      })
      .finally(() => {
        setIsForecastLoading(false)
      })

    return () => {
      abortController.abort()
    }
  }, [hasForecastInputs, selectedDateIso, selectedRoofs])

  const effectiveIsForecastLoading = hasForecastInputs ? isForecastLoading : false
  const effectiveForecastError = hasForecastInputs ? forecastError : null
  const effectiveForecastPoints = hasForecastInputs ? forecastPoints : []

  useEffect(() => {
    const source = 'forecast.compute'
    if (effectiveIsForecastLoading) {
      startGlobalProcessingToast(source, 'Processing forecast...')
    } else {
      stopGlobalProcessingToast(source)
    }
    return () => stopGlobalProcessingToast(source)
  }, [effectiveIsForecastLoading])

  return {
    selectedDateIso,
    selectedCount,
    hasForecastInputs,
    isForecastLoading: effectiveIsForecastLoading,
    forecastError: effectiveForecastError,
    forecastPoints: effectiveForecastPoints,
    totalSelectedKwp,
  }
}
