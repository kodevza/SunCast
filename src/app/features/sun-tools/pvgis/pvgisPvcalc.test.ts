import { describe, expect, it, vi } from 'vitest'
import { fetchPvgisFixedAnnualYield, extractPvgisFixedAnnualYield, extractPvgisFixedMonthlyYield } from './pvgisPvcalc'
import * as pvgisClient from '../../../clients/pvgisClient'

describe('pvgisPvcalc adapter', () => {
  it('extracts annual and monthly yields from a sample PVGIS response', () => {
    const sampleResponse = {
      outputs: {
        monthly: {
          fixed: [
            { month: 1, E_d: 1.26, E_m: 39.09, 'H(i)_d': 1.62, 'H(i)_m': 50.28, SD_m: 5.05 },
            { month: 2, E_d: 1.95, E_m: 54.58, 'H(i)_d': 2.44, 'H(i)_m': 68.44, SD_m: 7.9 },
          ],
        },
        totals: {
          fixed: {
            E_d: 3.08,
            E_m: 93.79,
            E_y: 1125.46,
            'H(i)_d': 4.05,
            'H(i)_m': 123.04,
            'H(i)_y': 1476.53,
            SD_m: 2.98,
            SD_y: 35.78,
            l_aoi: -4.0,
            l_spec: '0.93',
            l_tg: -8.53,
            l_total: -23.78,
          },
        },
      },
      inputs: {
        location: {
          latitude: 45,
          longitude: 8,
          elevation: 250,
        },
      },
      meta: {
        outputs: {
          totals: {
            variables: {
              E_y: { units: 'kWh/y' },
            },
          },
        },
      },
    }

    expect(extractPvgisFixedAnnualYield(sampleResponse)).toBeCloseTo(1125.46)
    expect(extractPvgisFixedMonthlyYield(sampleResponse)).toEqual([39.09, 54.58])
  })

  it('maps app roof inputs to PVGIS request params and returns structured payload', async () => {
    const sampleResponse = {
      inputs: {
        location: { latitude: 52.2297, longitude: 21.0122, elevation: 113 },
        meteo_data: {
          radiation_db: 'PVGIS-SARAH3',
          meteo_db: 'ERA5',
          year_min: 2005,
          year_max: 2023,
          use_horizon: true,
          horizon_db: 'DEM-calculated',
        },
        mounting_system: {
          fixed: {
            slope: { value: 35, optimal: false },
            azimuth: { value: -40, optimal: false },
            type: 'free-standing',
          },
        },
        pv_module: {
          technology: 'c-Si',
          peak_power: 8.75,
          system_loss: 14,
        },
      },
      outputs: {
        monthly: {
          fixed: [
            { month: 1, E_d: 7.11, E_m: 220.41, 'H(i)_d': 0, 'H(i)_m': 0, SD_m: 0 },
          ],
        },
        totals: {
          fixed: {
            E_d: 3.08,
            E_m: 93.79,
            E_y: 1125.46,
            'H(i)_d': 4.05,
            'H(i)_m': 123.04,
            'H(i)_y': 1476.53,
            SD_m: 2.98,
            SD_y: 35.78,
            l_aoi: -4.0,
            l_spec: '0.93',
            l_tg: -8.53,
            l_total: -23.78,
          },
        },
      },
      meta: { version: 'v5_3' },
    }

    const getPvgisPvcalcSpy = vi.spyOn(pvgisClient, 'getPvgisPvcalc').mockResolvedValue(sampleResponse as never)

    const result = await fetchPvgisFixedAnnualYield({
      latDeg: 52.2297,
      lonDeg: 21.0122,
      kwp: 8.75,
      roofPitchDeg: 35,
      roofAzimuthDeg: 140,
    })

    expect(getPvgisPvcalcSpy).toHaveBeenCalledTimes(1)
    expect(getPvgisPvcalcSpy).toHaveBeenCalledWith({
      latDeg: 52.2297,
      lonDeg: 21.0122,
      peakPowerKw: 8.75,
      lossPercent: 14,
      angleDeg: 35,
      aspectDeg: 140,
      signal: undefined,
      fetchImpl: undefined,
    })
    expect(result).toEqual({
      annualYieldKwh: 1125.46,
      monthlyYieldKwh: [220.41],
      response: sampleResponse,
    })
  })
})
