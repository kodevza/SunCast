// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnnualSunAccessPanel } from './AnnualSunAccessPanel'

const getContextMock = vi.fn()

function setInputValue(input: HTMLInputElement, value: string) {
  const prototype = Object.getPrototypeOf(input) as HTMLInputElement
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function renderPanel(overrides?: Partial<Parameters<typeof AnnualSunAccessPanel>[0]>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const onRunSimulation = overrides?.onRunSimulation ?? vi.fn(async () => undefined)

  const annualResult = {
    roofs: [
      {
        roofId: 'roof-1',
        sunHours: 1000,
        daylightHours: 1200,
        frontSideHours: 1100,
        sunAccessRatio: 0.8333,
        litCellCountWeighted: 1000,
        totalCellCountWeighted: 1200,
      },
    ],
    heatmapCells: [
      {
        roofId: 'roof-1',
        cellPolygon: [
          [20, 52],
          [20.00001, 52],
          [20.00001, 52.00001],
          [20, 52.00001],
        ] as Array<[number, number]>,
        litRatio: 0.75,
      },
    ],
    meta: {
      sampledDayCount: 7,
      simulatedHalfYear: true,
      stepMinutes: 30,
      sampleWindowDays: 5,
      dateStartIso: '2026-01-01',
      dateEndIso: '2026-12-31',
    },
  }

  act(() => {
    root.render(
      <AnnualSunAccessPanel
        selectedRoofCount={overrides?.selectedRoofCount ?? 1}
        gridResolutionM={overrides?.gridResolutionM ?? 0.1}
        dateStartIso={overrides?.dateStartIso ?? '2026-01-01'}
        dateEndIso={overrides?.dateEndIso ?? '2026-12-31'}
        state={overrides?.state ?? 'READY'}
        progressRatio={overrides?.progressRatio ?? 1}
        result={overrides?.result ?? annualResult}
        isAnnualHeatmapVisible={overrides?.isAnnualHeatmapVisible ?? true}
        onGridResolutionChange={overrides?.onGridResolutionChange ?? vi.fn()}
        onDateStartIsoChange={overrides?.onDateStartIsoChange ?? vi.fn()}
        onDateEndIsoChange={overrides?.onDateEndIsoChange ?? vi.fn()}
        onRunSimulation={onRunSimulation}
        onClearSimulation={overrides?.onClearSimulation ?? vi.fn()}
        onShowAnnualHeatmap={overrides?.onShowAnnualHeatmap ?? vi.fn()}
        onHideAnnualHeatmap={overrides?.onHideAnnualHeatmap ?? vi.fn()}
      />,
    )
  })

  return {
    container,
    onRunSimulation,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('AnnualSunAccessPanel', () => {
  beforeEach(() => {
    getContextMock.mockReset()
    getContextMock.mockReturnValue({
      imageSmoothingEnabled: true,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContextMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders annual heatmap canvas preview when simulation result is available', () => {
    const view = renderPanel()
    const canvas = view.container.querySelector('[data-testid="annual-sim-heatmap-canvas"]') as HTMLCanvasElement | null
    const overlayOpenButton = view.container.querySelector(
      '[data-testid="annual-sim-heatmap-overlay-open"]',
    ) as HTMLButtonElement | null
    expect(canvas).not.toBeNull()
    expect(overlayOpenButton).not.toBeNull()
    expect(getContextMock).toHaveBeenCalledWith('2d')
    expect((canvas?.width ?? 0) > 0).toBe(true)
    expect((canvas?.height ?? 0) > 0).toBe(true)
    view.unmount()
  })

  it('uses fixed 2026 annual dates without a year field', async () => {
    const view = renderPanel()
    const yearLabels = Array.from(view.container.querySelectorAll('label')).filter((label) =>
      label.textContent?.includes('Year'),
    )
    expect(yearLabels).toHaveLength(0)

    const startInput = view.container.querySelector('[data-testid="annual-date-start-input"]') as HTMLInputElement | null
    const endInput = view.container.querySelector('[data-testid="annual-date-end-input"]') as HTMLInputElement | null
    const runButton = view.container.querySelector('[data-testid="annual-sim-run"]') as HTMLButtonElement | null

    expect(startInput).not.toBeNull()
    expect(endInput).not.toBeNull()
    expect(runButton).not.toBeNull()

    act(() => {
      setInputValue(startInput!, '31/12')
      setInputValue(endInput!, '01/01')
    })

    act(() => {
      runButton!.click()
    })

    expect(view.onRunSimulation).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        dateStartIso: '2025-12-31',
        dateEndIso: '2026-01-01',
      }),
    )

    view.unmount()
  })
})
