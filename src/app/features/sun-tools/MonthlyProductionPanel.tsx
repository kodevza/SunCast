import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { deriveMonthlyProduction } from '../../analysis/deriveMonthlyProduction'
import { extractYearInTimeZone } from './sunDateTime'
import { fetchPvgisFixedAnnualYield } from './pvgis/pvgisPvcalc'
import type { SelectedRoofSunInput } from '../../../types/presentation-contracts'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface MonthlyProductionPanelProps {
  datetimeIso: string
  timeZone: string
  selectedRoofs: SelectedRoofSunInput[]
  computationEnabled?: boolean
}

const MONTH_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export function MonthlyProductionPanel({
  datetimeIso,
  timeZone,
  selectedRoofs,
  computationEnabled = true,
}: MonthlyProductionPanelProps) {
  const [pvgisMonthlyEnergyKwh, setPvgisMonthlyEnergyKwh] = useState<number[] | null>(null)
  const [isPvgisLoading, setIsPvgisLoading] = useState(false)
  const [pvgisError, setPvgisError] = useState<string | null>(null)

  const selectedYear = useMemo(() => extractYearInTimeZone(datetimeIso, timeZone) ?? new Date().getFullYear(), [datetimeIso, timeZone])

  const totalSelectedKwp = useMemo(
    () => selectedRoofs.reduce((sum, roof) => sum + (Number.isFinite(roof.kwp) && roof.kwp > 0 ? roof.kwp : 0), 0),
    [selectedRoofs],
  )

  const activePvgisRoofs = useMemo(
    () =>
      selectedRoofs.filter(
        (roof) =>
          Number.isFinite(roof.kwp) &&
          roof.kwp > 0 &&
          Number.isFinite(roof.latDeg) &&
          Number.isFinite(roof.lonDeg) &&
          Number.isFinite(roof.roofPitchDeg) &&
          Number.isFinite(roof.roofAzimuthDeg),
      ),
    [selectedRoofs],
  )

  const hasPvgisInputs = computationEnabled && activePvgisRoofs.length > 0

  const monthlyEnergyKwh = useMemo(() => {
    return deriveMonthlyProduction({
      year: selectedYear,
      timeZone,
      selectedRoofs,
      computationEnabled,
    })
  }, [computationEnabled, selectedRoofs, selectedYear, timeZone])

  useEffect(() => {
    if (!hasPvgisInputs) {
      return
    }

    const abortController = new AbortController()
    queueMicrotask(() => {
      if (!abortController.signal.aborted) {
        setIsPvgisLoading(true)
        setPvgisError(null)
      }
    })

    Promise.allSettled(
      activePvgisRoofs.map((roof) =>
        fetchPvgisFixedAnnualYield({
          latDeg: roof.latDeg,
          lonDeg: roof.lonDeg,
          kwp: roof.kwp,
          roofPitchDeg: roof.roofPitchDeg,
          roofAzimuthDeg: roof.roofAzimuthDeg,
          signal: abortController.signal,
        }),
      ),
    )
      .then((results) => {
        if (abortController.signal.aborted) {
          return
        }

        const totals = new Array<number>(12).fill(0)
        let hasAnyValue = false
        let failedCount = 0

        for (const result of results) {
          if (result.status !== 'fulfilled') {
            failedCount += 1
            continue
          }
          for (let index = 0; index < 12; index += 1) {
            const value = result.value.monthlyYieldKwh[index]
            if (Number.isFinite(value)) {
              totals[index] += value
              hasAnyValue = true
            }
          }
        }

        setPvgisMonthlyEnergyKwh(hasAnyValue ? totals : null)
        if (!hasAnyValue) {
          setPvgisError('PVGIS monthly series unavailable for current selection.')
        } else if (failedCount > 0) {
          setPvgisError(`PVGIS unavailable for ${failedCount} selected polygon(s).`)
        } else {
          setPvgisError(null)
        }
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) {
          setPvgisMonthlyEnergyKwh(null)
          const message = error instanceof Error ? error.message : 'Unknown PVGIS error'
          setPvgisError(`PVGIS request failed: ${message}`)
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsPvgisLoading(false)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [activePvgisRoofs, hasPvgisInputs])

  const chartData = useMemo<ChartData<'bar'> | null>(() => {
    if (!monthlyEnergyKwh) {
      return null
    }
    return {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: 'Monthly production (kWh)',
          data: monthlyEnergyKwh,
          borderColor: '#8fe287',
          backgroundColor: 'rgba(143, 226, 135, 0.45)',
          borderWidth: 1,
        },
        ...(hasPvgisInputs && pvgisMonthlyEnergyKwh
          ? [
              {
                label: 'PVGIS monthly production (kWh)',
                data: pvgisMonthlyEnergyKwh,
                borderColor: '#f9d768',
                backgroundColor: 'rgba(249, 215, 104, 0.45)',
                borderWidth: 1,
              },
            ]
          : []),
      ],
    }
  }, [hasPvgisInputs, monthlyEnergyKwh, pvgisMonthlyEnergyKwh])

  const chartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      animation: false as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#cad8de',
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${(typeof context.parsed.y === 'number' ? context.parsed.y : 0).toFixed(1)} kWh`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#cad8de',
            autoSkip: false,
            maxRotation: 0,
          },
          grid: {
            color: 'rgba(90, 110, 120, 0.2)',
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#cad8de',
          },
          grid: {
            color: 'rgba(90, 110, 120, 0.35)',
          },
        },
      },
    }),
    [],
  )

  return (
    <section className="panel-section">
      <h3>Monthly Production (kWh)</h3>
      {!computationEnabled && <p>Production computation paused while editing geometry.</p>}
      {selectedRoofs.length === 0 && <p>Select one or more solved polygons to compute monthly production.</p>}
      {computationEnabled && selectedRoofs.length > 0 && totalSelectedKwp <= 0 && (
        <p>Set kWp on selected polygons to compute production.</p>
      )}
      {hasPvgisInputs && isPvgisLoading && <p>Loading PVGIS series...</p>}
      {hasPvgisInputs && pvgisError && <p>{pvgisError}</p>}
      {chartData && monthlyEnergyKwh && (
        <>
          <div className="sun-daily-chart" data-testid="sun-monthly-chart">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </>
      )}
    </section>
  )
}
