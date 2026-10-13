import { describe, expect, it } from 'vitest'
import { getPvgisProductionReport } from './pvgisReport'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'

const roof: SelectedRoofSunInput = {
  footprintId: 'roof-1', latDeg: 52.2, lonDeg: 21, kwp: 4,
  roofPitchDeg: 35, roofAzimuthDeg: 180, roofPlane: { p: 0, q: 0, r: 1 },
}

describe('PVGIS production report', () => {
  it('returns monthly kWh distribution and the selected-month daily PVGIS estimate', async () => {
    const report = await getPvgisProductionReport({
      dateIso: '2023-06-21', year: 2023, roofs: [roof, { ...roof, footprintId: 'roof-2' }],
      fetchRoofEstimate: async () => ({ annualYieldKwh: 78, monthlyYieldKwh: Array.from({ length: 12 }, (_, index) => index + 1), dailyYieldKwhByMonth: Array.from({ length: 12 }, (_, index) => index + 0.5), response: {} }),
      fetchRoofDailyEnergy: async () => 7.25,
    })
    expect(report).toMatchObject({ status: 'ready', year: 2023, dailyEnergyKwh: 14.5, annualEnergyKwh: 156 })
    expect(report.monthlyEnergyKwh).toHaveLength(12)
    expect(report.monthlyEnergyKwh[5]).toEqual({ month: 6, energyKwh: 12 })
  })

  it('does not present partial aggregates when one roof fails', async () => {
    const report = await getPvgisProductionReport({
      dateIso: '2023-06-21', roofs: [roof, { ...roof, footprintId: 'roof-2' }],
      fetchRoofEstimate: async (item) => {
        if (item.footprintId === 'roof-2') throw new Error('offline')
        return { annualYieldKwh: 78, monthlyYieldKwh: Array(12).fill(1), dailyYieldKwhByMonth: Array(12).fill(1), response: {} }
      },
      fetchRoofDailyEnergy: async () => 1,
    })
    expect(report.status).toBe('unavailable')
    expect(report.annualEnergyKwh).toBeNull()
  })
})
