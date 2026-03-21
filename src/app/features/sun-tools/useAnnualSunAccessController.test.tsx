// @vitest-environment jsdom
import { act, useEffect } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnnualSunAccessController } from './useAnnualSunAccessController'

function renderHook(args: Parameters<typeof useAnnualSunAccessController>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const latestRef: { current: ReturnType<typeof useAnnualSunAccessController> | null } = { current: null }

  function Probe() {
    const latest = useAnnualSunAccessController(args)

    useEffect(() => {
      latestRef.current = latest
    }, [latest])

    return null
  }

  act(() => {
    root.render(<Probe />)
  })

  return {
    get: () => {
      if (!latestRef.current) {
        throw new Error('Hook did not render')
      }
      return latestRef.current
    },
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('useAnnualSunAccessController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps annual simulation controls inside the sun-tools feature boundary', () => {
    const setShadingGridResolutionM = vi.fn()
    const setSunProjectionDateStartIso = vi.fn()
    const setSunProjectionDateEndIso = vi.fn()
    const clearSimulation = vi.fn()
    const setRequestedHeatmapMode = vi.fn()

    const hook = renderHook({
      project: {
        state: {
          shadingSettings: {
            enabled: true,
            gridResolutionM: 0.75,
          },
          sunProjection: {
            enabled: true,
            datetimeIso: null,
            dailyDateIso: null,
            dateStartIso: '2026-01-01',
            dateEndIso: '2026-12-31',
          },
        },
        setShadingGridResolutionM,
        setSunProjectionDateStartIso,
        setSunProjectionDateEndIso,
      },
      analysis: {
        shadingRoofs: [{ roofId: 'roof-1' }, { roofId: 'roof-2' }],
        annualSimulation: {
          state: 'READY',
          progress: { ratio: 0.6 },
          result: null,
          error: null,
          heatmapFeatures: [{ type: 'Feature' }],
          runSimulation: vi.fn(async () => undefined),
          clearSimulation,
        },
        heatmap: {
          annualVisible: true,
        },
        setRequestedHeatmapMode,
      },
    } as unknown as Parameters<typeof useAnnualSunAccessController>[0])

    expect(hook.get()).toMatchObject({
      selectedRoofCount: 2,
      gridResolutionM: 0.75,
      dateStartIso: '2026-01-01',
      dateEndIso: '2026-12-31',
      state: 'READY',
      progressRatio: 0.6,
      result: null,
      error: null,
      isAnnualHeatmapVisible: true,
    })

    hook.get().onGridResolutionChange(1.2)
    hook.get().onDateStartIsoChange('2026-02-01')
    hook.get().onDateEndIsoChange('2026-11-30')
    hook.get().onShowAnnualHeatmap()
    hook.get().onClearSimulation()
    hook.get().onHideAnnualHeatmap()

    expect(setShadingGridResolutionM).toHaveBeenCalledWith(1.2)
    expect(setSunProjectionDateStartIso).toHaveBeenCalledWith('2026-02-01')
    expect(setSunProjectionDateEndIso).toHaveBeenCalledWith('2026-11-30')
    expect(clearSimulation).toHaveBeenCalledTimes(1)
    expect(setRequestedHeatmapMode).toHaveBeenNthCalledWith(1, 'annual-sun-access')
    expect(setRequestedHeatmapMode).toHaveBeenNthCalledWith(2, 'live-shading')
    expect(setRequestedHeatmapMode).toHaveBeenNthCalledWith(3, 'live-shading')

    hook.unmount()
  })
})
