// @vitest-environment jsdom
import { act, useEffect } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnnualSunAccessController } from './useAnnualSunAccessController'

const mockUseSunCastAppContext = vi.fn()

vi.mock('../../screens/SunCastAppProvider', () => ({
  useSunCastAppContext: () => mockUseSunCastAppContext(),
}))

function renderHook() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const latestRef: { current: ReturnType<typeof useAnnualSunAccessController> | null } = { current: null }

  function Probe() {
    const latest = useAnnualSunAccessController()

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
    mockUseSunCastAppContext.mockReset()
  })

  it('keeps annual simulation controls inside the sun-tools feature boundary', () => {
    const setShadingGridResolutionM = vi.fn()
    const clearSimulation = vi.fn()
    const setRequestedHeatmapMode = vi.fn()

    mockUseSunCastAppContext.mockReturnValue({
      project: {
        state: {
          shadingSettings: {
            enabled: true,
            gridResolutionM: 0.75,
          },
        },
        setShadingGridResolutionM,
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
    })

    const hook = renderHook()

    expect(hook.get()).toMatchObject({
      selectedRoofCount: 2,
      gridResolutionM: 0.75,
      state: 'READY',
      progressRatio: 0.6,
      result: null,
      error: null,
      isAnnualHeatmapVisible: true,
    })

    hook.get().onGridResolutionChange(1.2)
    hook.get().onShowAnnualHeatmap()
    hook.get().onClearSimulation()
    hook.get().onHideAnnualHeatmap()

    expect(setShadingGridResolutionM).toHaveBeenCalledWith(1.2)
    expect(clearSimulation).toHaveBeenCalledTimes(1)
    expect(setRequestedHeatmapMode).toHaveBeenNthCalledWith(1, 'annual-sun-access')
    expect(setRequestedHeatmapMode).toHaveBeenNthCalledWith(2, 'live-shading')
    expect(setRequestedHeatmapMode).toHaveBeenNthCalledWith(3, 'live-shading')

    hook.unmount()
  })
})
