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
import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { deriveMonthlyProduction } from '../../analysis/deriveMonthlyProduction'
import { extractYearInTimeZone } from './sunDateTime'
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
  const selectedYear = useMemo(() => extractYearInTimeZone(datetimeIso, timeZone) ?? new Date().getFullYear(), [datetimeIso, timeZone])

  const totalSelectedKwp = useMemo(
    () => selectedRoofs.reduce((sum, roof) => sum + (Number.isFinite(roof.kwp) && roof.kwp > 0 ? roof.kwp : 0), 0),
    [selectedRoofs],
  )

  const monthlyEnergyKwh = useMemo(() => {
    return deriveMonthlyProduction({
      year: selectedYear,
      timeZone,
      selectedRoofs,
      computationEnabled,
    })
  }, [computationEnabled, selectedRoofs, selectedYear, timeZone])

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
      ],
    }
  }, [monthlyEnergyKwh])

  const chartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      animation: false as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
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
