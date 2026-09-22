/**
 * Machine-readable counterpart of docs/MEASUREMENTS.md.
 *
 * Keep this catalogue and the document in sync.  Consumers render these
 * entries instead of owning their own copies of the production methodology.
 */
export type MeasurementAssumptionCode =
  | 'FORECAST_IS_ESTIMATE'
  | 'FORECAST_UTC'
  | 'HOURLY_ENERGY_APPROXIMATION'
  | 'EXTERNAL_FORECAST_REQUIRED'
  | 'NO_INVERTER_TELEMETRY'
  | 'SYSTEM_LOSSES_NOT_MODELLED'

export interface MeasurementAssumption {
  code: MeasurementAssumptionCode
  severity: 'info' | 'warning'
  text: string
}

export const MEASUREMENT_ASSUMPTIONS: readonly MeasurementAssumption[] = [
  {
    code: 'FORECAST_IS_ESTIMATE',
    severity: 'info',
    text: 'Wynik jest estymacją, a nie odczytem z falownika ani pomiarem rzeczywistej produkcji.',
  },
  {
    code: 'FORECAST_UTC',
    severity: 'info',
    text: 'Prognoza godzinowa i jej data są interpretowane w strefie UTC.',
  },
  {
    code: 'HOURLY_ENERGY_APPROXIMATION',
    severity: 'info',
    text: 'Energia dobowa jest sumą godzinowej mocy traktowanej jako jednogodzinne interwały.',
  },
  {
    code: 'EXTERNAL_FORECAST_REQUIRED',
    severity: 'warning',
    text: 'Prognoza zależy od dostępności danych Open-Meteo.',
  },
  {
    code: 'NO_INVERTER_TELEMETRY',
    severity: 'warning',
    text: 'Model nie wykorzystuje telemetrii instalacji ani falownika.',
  },
  {
    code: 'SYSTEM_LOSSES_NOT_MODELLED',
    severity: 'warning',
    text: 'Model nie uwzględnia awarii, zabrudzenia paneli ani szczegółowych strat systemowych.',
  },
]
