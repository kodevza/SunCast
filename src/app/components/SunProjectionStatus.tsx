import type { SunProjectionResult } from '../../geometry/sun/sunProjection'

interface SunProjectionStatusProps {
  enabled: boolean
  hasDatetime: boolean
  datetimeIso: string
  datetimeError: string | null
  onToggleEnabled: (enabled: boolean) => void
  onDatetimeChange: (datetimeIso: string) => void
  result: SunProjectionResult | null
}

export function SunProjectionStatus({
  enabled,
  hasDatetime,
  datetimeIso,
  datetimeError,
  onToggleEnabled,
  onDatetimeChange,
  result,
}: SunProjectionStatusProps) {
  return (
    <section className="panel-section">
      <h3>Sun Projection</h3>
      <div className="sun-controls">
        <label className="sun-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggleEnabled(event.target.checked)}
            data-testid="sun-projection-toggle"
          />
          Enable sun projection
        </label>
        <label className="sun-datetime-label" htmlFor="sun-datetime-input">
          Datetime (ISO with timezone)
        </label>
        <input
          id="sun-datetime-input"
          type="text"
          value={datetimeIso}
          onChange={(event) => onDatetimeChange(event.target.value)}
          placeholder="2026-03-05T14:30:00+01:00"
          data-testid="sun-datetime-input"
        />
      </div>
      {datetimeError && <p className="status-error">{datetimeError}</p>}
      {!enabled && <p>Sun projection is disabled.</p>}
      {enabled && !hasDatetime && <p data-testid="sun-status-set-datetime">Set datetime</p>}
      {enabled && hasDatetime && result && (
        <div className="sun-status" data-testid="sun-projection-status">
          {result.sunElevationDeg <= 0 ? (
            <p data-testid="sun-poa-value">POA: 0 W/m2 (sun below horizon)</p>
          ) : (
            <p data-testid="sun-poa-value">POA (clear-sky): {result.poaIrradiance_Wm2.toFixed(0)} W/m2</p>
          )}
          <p>
            Sun: az={result.sunAzimuthDeg.toFixed(1)} deg, el={result.sunElevationDeg.toFixed(1)} deg
          </p>
          <p>Incidence: {result.incidenceDeg.toFixed(1)} deg</p>
        </div>
      )}
    </section>
  )
}
