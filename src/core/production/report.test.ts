import { describe, expect, it } from 'vitest'
import { getForecastProductionReport } from './report'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'

const roof: SelectedRoofSunInput = { footprintId: 'roof-1', latDeg: 52.2, lonDeg: 21, kwp: 4, roofPitchDeg: 35, roofAzimuthDeg: 180, roofPlane: { p: 0, q: 0, r: 1 } }

describe('forecast production report', () => {
  it('reports a complete aggregate and methodology for successful provider results', async () => {
    const report = await getForecastProductionReport({ dateIso: '2026-03-07', roofs: [roof], fetchRoofIrradiance: async () => [{ timestampIso: '2026-03-07T12:00', irradianceWm2: 500 }] })
    expect(report.status).toBe('ready')
    expect(report.totalEnergyKwh).toBe(2)
    expect(report.peak).toEqual({ timeLabel: '12:00', powerKw: 2 })
    expect(report.assumptions.length).toBeGreaterThan(0)
  })

  it('does not return a partial aggregate when any selected roof provider fails', async () => {
    const report = await getForecastProductionReport({ dateIso: '2026-03-07', roofs: [roof, { ...roof, footprintId: 'roof-2' }], fetchRoofIrradiance: async (item) => {
      if (item.footprintId === 'roof-2') throw new Error('offline')
      return [{ timestampIso: '2026-03-07T12:00', irradianceWm2: 500 }]
    } })
    expect(report.status).toBe('unavailable')
    expect(report.points).toEqual([])
  })
})
