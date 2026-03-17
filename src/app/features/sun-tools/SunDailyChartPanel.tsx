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
import {
  formatTimestampHHmm,
  getSunriseSunset,
} from '../../../geometry/sun/dailyEstimation'
import { deriveDailyProductionProfile } from '../../analysis/deriveDailyProductionProfile'
import type { RoofPlane } from '../../../types/geometry'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface SunDailyChartPanelProps {
  dateIso: string
  timeZone: string
  selectedRoofs: Array<{
    footprintId: string
    latDeg: number
    lonDeg: number
    kwp: number
    roofPlane: RoofPlane
  }>
  computationEnabled?: boolean
}

export function SunDailyChartPanel({ dateIso, timeZone, selectedRoofs, computationEnabled = true }: SunDailyChartPanelProps) {
  const totalSelectedKwp = useMemo(
    () => selectedRoofs.reduce((sum, roof) => sum + (Number.isFinite(roof.kwp) && roof.kwp > 0 ? roof.kwp : 0), 0),
    [selectedRoofs],
  )

  const aggregated = useMemo(() => {
    return deriveDailyProductionProfile({
      dateIso,
      timeZone,
      selectedRoofs,
      computationEnabled,
    })
  }, [computationEnabled, dateIso, selectedRoofs, timeZone])

  const sunriseSunset = useMemo(() => {
    if (!computationEnabled || !dateIso || selectedRoofs.length === 0) {
      return null
    }
    const firstRoof = selectedRoofs[0]
    return getSunriseSunset({ dateIso, timeZone, latDeg: firstRoof.latDeg, lonDeg: firstRoof.lonDeg })
  }, [computationEnabled, dateIso, selectedRoofs, timeZone])

  const chartData = useMemo<ChartData<'line'> | null>(() => {
    if (!aggregated) {
      return null
    }

    return {
      labels: aggregated.labels,
      datasets: [
        {
          data: aggregated.productionValues_kW,
          yAxisID: 'yProduction',
          borderColor: '#cad8de',
          backgroundColor: 'rgba(246, 210, 95, 0.18)',
          pointRadius: 1,
          pointHoverRadius: 3,
          borderWidth: 1.5,
          fill: false,
          tension: 0.2,
        },
      ],
    }
  }, [aggregated])

  const chartOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      animation: false as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
          labels: {
            color: '#cad8de',
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const y = context.parsed.y
              return `${(typeof y === 'number' ? y : 0).toFixed(2)} kW`
            },
          },
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
        yProduction: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          ticks: {
            color: '#cad8de',
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    }),
    [],
  )

  return (
    <section className="panel-section">
      <h3>Daily Production (kW)</h3>

      {!dateIso && <p>Select date/time above to compute sunrise, sunset, and production profile.</p>}
      {!computationEnabled && <p>Production computation paused while editing geometry.</p>}

      {computationEnabled && dateIso && !sunriseSunset && (
        <p data-testid="sun-daily-no-events">No sunrise/sunset for this date at this latitude.</p>
      )}


      {computationEnabled && dateIso && selectedRoofs.length > 0 && totalSelectedKwp <= 0 && (
        <p>Set kWp on selected polygons to compute production.</p>
      )}

      {aggregated && chartData && (
        <>
          <div className="sun-daily-chart" data-testid="sun-daily-chart">
            <Line data={chartData} options={chartOptions} />
          </div>
          <p data-testid="sun-daily-production-peak">
            Real production peak: {aggregated.peakProductionValue_kW.toFixed(2)} kW at {aggregated.peakProductionTimeLabel}
          </p>
          <p data-testid="sun-daily-power">Weighted capacity: {totalSelectedKwp.toFixed(1)} kWp</p>
          <p data-testid="sun-daily-window">
            Window: {formatTimestampHHmm(aggregated.sunriseTs, timeZone)}-{formatTimestampHHmm(aggregated.sunsetTs, timeZone)}
          </p>
        </>
      )}
    </section>
  )
}
