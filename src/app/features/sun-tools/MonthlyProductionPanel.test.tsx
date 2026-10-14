// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { MonthlyProductionPanel } from './MonthlyProductionPanel'

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="monthly-production-bars" />,
}))

describe('MonthlyProductionPanel', () => {
  it('identifies the browser series as clear-sky and reserves PVGIS data for the CLI', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <MonthlyProductionPanel
          datetimeIso="2026-06-01T12:00:00.000Z"
          timeZone="Europe/Warsaw"
          selectedRoofs={[{
            footprintId: 'roof-1', latDeg: 52.2, lonDeg: 21, kwp: 4,
            roofPitchDeg: 35, roofAzimuthDeg: 180, roofPlane: { p: 0, q: 0, r: 1 },
          }]}
        />,
      )
    })

    const hint = container.querySelector('[aria-label*="clear-sky"]')
    expect(hint?.getAttribute('title')).toContain('CLI report uses PVGIS climate data')
    expect(container.querySelector('[data-testid="monthly-production-bars"]')).not.toBeNull()
    expect(container.textContent).not.toContain('PVGIS monthly series unavailable')

    act(() => root.unmount())
    container.remove()
  })
})
