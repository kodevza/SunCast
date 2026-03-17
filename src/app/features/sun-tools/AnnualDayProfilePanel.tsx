import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { deriveAnnualDayProfile } from '../../analysis/deriveAnnualDayProfile'
import type { SelectedRoofSunInput } from './SunOverlayColumn'
import { extractYearInTimeZone } from './sunDateTime'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface AnnualDayProfilePanelProps {
  datetimeIso: string
  timeZone: string
  selectedRoofs: SelectedRoofSunInput[]
  computationEnabled?: boolean
}

export function AnnualDayProfilePanel({
  datetimeIso,
  timeZone,
  selectedRoofs,
  computationEnabled = true,
}: AnnualDayProfilePanelProps) {
  const selectedYear = useMemo(() => extractYearInTimeZone(datetimeIso, timeZone) ?? new Date().getFullYear(), [datetimeIso, timeZone])

  const annualProfile = useMemo(() => {
    return deriveAnnualDayProfile({
      year: selectedYear,
      timeZone,
      selectedRoofs,
      computationEnabled,
    })
  }, [computationEnabled, selectedRoofs, selectedYear, timeZone])

  const chartData = useMemo<ChartData<'line'> | null>(() => {
    if (!annualProfile) {
      return null
    }

    return {
      labels: annualProfile.points.map((point) => point.timeLabel),
      datasets: [
        {
          label: 'Annual aggregated estimated output (kW-sum)',
          data: annualProfile.points.map((point) => point.value),
          borderColor: '#8fe287',
          backgroundColor: 'rgba(143, 226, 135, 0.18)',
          pointRadius: 1,
          pointHoverRadius: 3,
          borderWidth: 1.5,
          fill: true,
          tension: 0.2,
        },
      ],
    }
  }, [annualProfile])

  const chartOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      animation: false as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
            color: '#cad8de',
          },
          grid: {
            color: 'rgba(90, 110, 120, 0.35)',
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

  const annualPeak = useMemo(() => {
    if (!annualProfile || annualProfile.points.length === 0) {
      return null
    }
    return annualProfile.points.reduce((peak, point) => (point.value > peak.value ? point : peak), annualProfile.points[0])
  }, [annualProfile])

  const annualEnergyKwhEstimate = useMemo(() => {
    if (!annualProfile || annualProfile.points.length === 0) {
      return null
    }
    const stepHours = annualProfile.meta.stepMinutes / 60
    return annualProfile.points.reduce((sum, point) => sum + point.value * stepHours, 0)
  }, [annualProfile])

  return (
    <section className="panel-section">
      <h3>Annual Day Profile sum(kW)</h3>
      {!computationEnabled && <p>Production computation paused while editing geometry.</p>}
      {selectedRoofs.length === 0 && <p>Select one or more solved polygons to compute annual aggregation.</p>}
      {annualProfile && chartData && annualPeak && (
        <>
          <div className="sun-daily-chart" data-testid="sun-annual-chart">
            <Line data={chartData} options={chartOptions} />
          </div>
          <p data-testid="sun-annual-sampling-meta">
            Sampling: 1 day every {annualProfile.meta.sampleWindowDays} days, weighted to cover all {annualProfile.meta.dayCount}{' '}
            days ({annualProfile.meta.sampledDayCount} sampled days).
          </p>
          {annualEnergyKwhEstimate !== null && (
            <p data-testid="sun-annual-total">
              Overall PV: {annualEnergyKwhEstimate.toFixed(1)} kWh
            </p>
          )}
        </>
      )}
    </section>
  )
}
