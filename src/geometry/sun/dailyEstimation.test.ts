import { describe, expect, it } from 'vitest'
import {
  SUN_DAILY_SERIES_STEP_MINUTES,
  expectedSeriesPointCount,
  getDailyPoaSeries,
  getSunriseSunset,
} from './dailyEstimation'

describe('dailyEstimation', () => {
  it('returns deterministic sunrise/sunset and expected series length', () => {
    const input = {
      dateIso: '2026-06-21',
      timeZone: 'America/New_York',
      latDeg: 40.7128,
      lonDeg: -74.006,
    }

    const window = getSunriseSunset(input)
    expect(window).not.toBeNull()
    if (!window) {
      return
    }

    expect(window.sunriseTs).toBeLessThan(window.sunsetTs)

    const series = getDailyPoaSeries({
      ...input,
      plane: { p: 0.12, q: -0.05, r: 2 },
      stepMinutes: SUN_DAILY_SERIES_STEP_MINUTES,
    })

    expect(series).not.toBeNull()
    if (!series) {
      return
    }

    expect(series.labels.length).toBe(
      expectedSeriesPointCount(window.sunriseTs, window.sunsetTs, SUN_DAILY_SERIES_STEP_MINUTES),
    )
    expect(series.labels.length).toBe(series.values_Wm2.length)
  })

  it('emits finite, non-negative values and unique ordered labels', () => {
    const series = getDailyPoaSeries({
      dateIso: '2026-03-05',
      timeZone: 'Europe/Warsaw',
      latDeg: 52.2297,
      lonDeg: 21.0122,
      plane: { p: 0.08, q: 0.14, r: 1.4 },
      stepMinutes: 15,
    })

    expect(series).not.toBeNull()
    if (!series) {
      return
    }

    for (const value of series.values_Wm2) {
      expect(Number.isFinite(value)).toBeTruthy()
      expect(value).toBeGreaterThanOrEqual(0)
    }

    const uniqueLabels = new Set(series.labels)
    expect(uniqueLabels.size).toBe(series.labels.length)

    for (let i = 1; i < series.timestamps.length; i += 1) {
      expect(series.timestamps[i]).toBeGreaterThan(series.timestamps[i - 1])
    }
  })

  it('finds sunrise and sunset for summer date in Europe/Warsaw', () => {
    const window = getSunriseSunset({
      dateIso: '2026-06-21',
      timeZone: 'Europe/Warsaw',
      latDeg: 52.2297,
      lonDeg: 21.0122,
    })

    expect(window).not.toBeNull()
    if (!window) {
      return
    }
    expect(window.sunriseTs).toBeLessThan(window.sunsetTs)
  })
})
