import { describe, expect, it } from 'vitest'
import { calculateHourlyForecastEnergyKwh, createRoofForecastProfile, mergeSettledRoofForecasts } from './forecast'

describe('core forecast', () => {
  it('filters invalid irradiance and scales valid points by kWp', () => {
    expect(createRoofForecastProfile([
      { timestampIso: '2026-03-06T10:00', irradianceWm2: 400 },
      { timestampIso: '2026-03-07T12:00', irradianceWm2: 500 },
      { timestampIso: '2026-03-07T13:00', irradianceWm2: 0 },
    ], '2026-03-07', 1000)).toEqual([{ minuteOfDay: 720, value: 500 }])
  })

  it('aggregates profiles and energy deterministically', () => {
    const merged = mergeSettledRoofForecasts([
      { status: 'fulfilled', value: [{ minuteOfDay: 600, value: 2 }] },
      { status: 'fulfilled', value: [{ minuteOfDay: 600, value: 3 }] },
    ])
    expect(merged.points).toEqual([{ minuteOfDay: 600, timeLabel: '10:00', estimatedKw: 5 }])
    expect(calculateHourlyForecastEnergyKwh(merged.points)).toBe(5)
  })
})
