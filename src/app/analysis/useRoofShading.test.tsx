// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObstacleStateEntry } from '../../types/geometry'
import { useRoofShading, type ShadeHeatmapFeature, type UseRoofShadingArgs } from './useRoofShading'

const METERS_PER_DEG = 111_319.49079327358

function metersToLonLat(xM: number, yM: number): [number, number] {
  return [xM / METERS_PER_DEG, yM / METERS_PER_DEG]
}

const FLAT_ROOF_POLYGON: Array<[number, number]> = [
  metersToLonLat(-2, -2),
  metersToLonLat(2, -2),
  metersToLonLat(2, 2),
  metersToLonLat(-2, 2),
]

const FULL_BLOCKER_OBSTACLE: ObstacleStateEntry = {
  id: 'ob-1',
  kind: 'building',
  shape: {
    type: 'polygon-prism',
    polygon: FLAT_ROOF_POLYGON,
  },
  heightAboveGroundM: 12,
}

function renderUseRoofShading(initialArgs: UseRoofShadingArgs) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const latestRef: {
    current: ReturnType<typeof useRoofShading> | null
  } = { current: null }
  const argsRef: { current: UseRoofShadingArgs } = { current: initialArgs }

  function Probe({ args }: { args: UseRoofShadingArgs }) {
    const value = useRoofShading(args)
    const sharedRef = useRef(latestRef)
    useEffect(() => {
      sharedRef.current.current = value
    }, [value, sharedRef])
    return null
  }

  const rerender = (nextArgs?: UseRoofShadingArgs) => {
    if (nextArgs) {
      argsRef.current = nextArgs
    }
    act(() => {
      root.render(<Probe args={argsRef.current} />)
    })
  }

  rerender(initialArgs)

  return {
    get: () => {
      if (!latestRef.current) {
        throw new Error('Hook did not render')
      }
      return latestRef.current
    },
    rerender,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function makeArgs(overrides: Partial<UseRoofShadingArgs> = {}): UseRoofShadingArgs {
  return {
    cacheRevision: 1,
    enabled: true,
    roofs: [
      {
        roofId: 'roof-1',
        polygon: FLAT_ROOF_POLYGON,
        vertexHeightsM: [1, 1, 1, 1],
      },
    ],
    obstacles: [],
    datetimeIso: '2026-03-20T10:00:00Z',
    gridResolutionM: 1,
    interactionActive: false,
    interactionThrottleMs: 100,
    ...overrides,
  }
}

function allFeatureIntensities(features: ShadeHeatmapFeature[]): number[] {
  return features.map((feature) => feature.properties.intensity)
}

describe('useRoofShading', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('throttles recompute during interaction and resolves to final mode with stable lit output', () => {
    vi.useFakeTimers()
    const hook = renderUseRoofShading(makeArgs({ interactionActive: true }))

    expect(hook.get().computeState).toBe('SCHEDULED')
    expect(hook.get().computeMode).toBe('coarse')

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(hook.get().computeState).toBe('SCHEDULED')

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().computeMode).toBe('coarse')
    expect(hook.get().usedGridResolutionM).toBeGreaterThan(1)
    expect(hook.get().heatmapFeatures).toHaveLength(4)
    expect(allFeatureIntensities(hook.get().heatmapFeatures)).toEqual([1, 1, 1, 1])

    hook.rerender(makeArgs({ interactionActive: false }))

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().computeMode).toBe('final')
    expect(hook.get().usedGridResolutionM).toBeCloseTo(1)
    expect(hook.get().heatmapFeatures).toHaveLength(16)
    expect(allFeatureIntensities(hook.get().heatmapFeatures)).toEqual(new Array(16).fill(1))

    hook.unmount()
    vi.useRealTimers()
  })

  it('returns fully lit cells for clear roof and fully shaded cells for a full blocker', () => {
    const clearHook = renderUseRoofShading(makeArgs({ obstacles: [] }))
    expect(clearHook.get().computeState).toBe('READY')
    expect(clearHook.get().resultStatus).toBe('OK')
    expect(clearHook.get().heatmapFeatures).toHaveLength(16)
    expect(allFeatureIntensities(clearHook.get().heatmapFeatures)).toEqual(new Array(16).fill(1))
    clearHook.unmount()

    const blockedHook = renderUseRoofShading(makeArgs({ obstacles: [FULL_BLOCKER_OBSTACLE] }))
    expect(blockedHook.get().computeState).toBe('READY')
    expect(blockedHook.get().resultStatus).toBe('OK')
    expect(blockedHook.get().heatmapFeatures).toHaveLength(16)
    expect(allFeatureIntensities(blockedHook.get().heatmapFeatures)).toEqual(new Array(16).fill(0))
    blockedHook.unmount()
  })

  it('uses cached result when geometry/time fingerprints are unchanged', () => {
    const hook = renderUseRoofShading(makeArgs({ datetimeIso: '2026-03-20T10:00:00Z' }))
    const firstFeatures = hook.get().heatmapFeatures

    hook.rerender(
      makeArgs({
        datetimeIso: '2026-03-20T10:00:00Z',
        roofs: [
          {
            roofId: 'roof-1',
            polygon: [...FLAT_ROOF_POLYGON],
            vertexHeightsM: [1, 1, 1, 1],
          },
        ],
      }),
    )

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().heatmapFeatures).toBe(firstFeatures)
    expect(allFeatureIntensities(hook.get().heatmapFeatures)).toEqual(new Array(16).fill(1))

    hook.unmount()
  })

  it('invalidates cache when cache revision changes', () => {
    const hook = renderUseRoofShading(makeArgs({ cacheRevision: 1 }))
    const firstFeatures = hook.get().heatmapFeatures

    hook.rerender(makeArgs({ cacheRevision: 2 }))

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().heatmapFeatures).not.toBe(firstFeatures)
    expect(allFeatureIntensities(hook.get().heatmapFeatures)).toEqual(new Array(16).fill(1))

    hook.unmount()
  })

  it('recomputes and changes output when obstacle geometry changes', () => {
    const hook = renderUseRoofShading(makeArgs({ obstacles: [] }))
    expect(allFeatureIntensities(hook.get().heatmapFeatures)).toEqual(new Array(16).fill(1))

    hook.rerender(makeArgs({ obstacles: [FULL_BLOCKER_OBSTACLE] }))

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().heatmapFeatures).toHaveLength(16)
    expect(allFeatureIntensities(hook.get().heatmapFeatures)).toEqual(new Array(16).fill(0))

    hook.unmount()
  })
})
