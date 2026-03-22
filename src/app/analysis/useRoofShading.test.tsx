// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObstacleStateEntry } from '../../types/geometry'
import { useRoofShading, type UseRoofShadingArgs } from './useRoofShading'

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

function countShadedCells(result: ReturnType<typeof useRoofShading>['readyResult']): number {
  if (!result || result.status !== 'OK') {
    return 0
  }

  return result.roofs.reduce((count, roof) => {
    let roofCount = 0
    for (const shadeFactor of roof.shadeFactors) {
      if (shadeFactor > 0) {
        roofCount += 1
      }
    }
    return count + roofCount
  }, 0)
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

function flushAllTimers() {
  act(() => {
    vi.runAllTimers()
  })
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

describe('useRoofShading', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('exposes the ready result without materializing a shaded-cells array in the hook output', () => {
    vi.useFakeTimers()
    const hook = renderUseRoofShading(makeArgs({ cacheRevision: 41 }))

    expect(hook.get().computeState).toBe('PENDING')
    expect(hook.get().readyResult).toBeNull()

    flushAllTimers()

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().readyResult).not.toBeNull()
    expect(hook.get().readyResult?.status).toBe('OK')

    hook.unmount()
    vi.useRealTimers()
  })

  it('keeps the previous shade grid visible while recomputing asynchronously', () => {
    vi.useFakeTimers()
    const hook = renderUseRoofShading(makeArgs({ cacheRevision: 41 }))

    expect(hook.get().computeState).toBe('PENDING')
    expect(hook.get().readyResult).toBeNull()

    flushAllTimers()

    expect(hook.get().computeState).toBe('READY')
    const readyResult = hook.get().readyResult

    hook.rerender(
      makeArgs({
        cacheRevision: 41,
        obstacles: [FULL_BLOCKER_OBSTACLE],
      }),
    )

    expect(hook.get().computeState).toBe('STALE')
    expect(hook.get().readyResult).toBe(readyResult)
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    flushAllTimers()

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().readyResult).not.toBe(readyResult)
    expect(countShadedCells(hook.get().readyResult)).toBe(16)

    hook.unmount()
    vi.useRealTimers()
  })

  it('throttles recompute during interaction and resolves to final mode with stable lit output', () => {
    vi.useFakeTimers()
    const hook = renderUseRoofShading(makeArgs({ interactionActive: true }))

    expect(hook.get().computeState).toBe('PENDING')
    expect(hook.get().computeMode).toBe('coarse')

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(hook.get().computeState).toBe('PENDING')

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().computeMode).toBe('coarse')
    expect(hook.get().usedGridResolutionM).toBeGreaterThan(1)
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    hook.rerender(makeArgs({ interactionActive: false }))

    expect(hook.get().computeState).toBe('STALE')
    expect(hook.get().computeMode).toBe('coarse')
    expect(hook.get().usedGridResolutionM).toBeGreaterThan(1)
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    flushAllTimers()

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().computeMode).toBe('final')
    expect(hook.get().usedGridResolutionM).toBeCloseTo(1)
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    hook.unmount()
    vi.useRealTimers()
  })

  it('returns fully lit cells for clear roof and fully shaded cells for a full blocker', () => {
    vi.useFakeTimers()
    const clearHook = renderUseRoofShading(makeArgs({ cacheRevision: 42, obstacles: [] }))
    expect(clearHook.get().computeState).toBe('PENDING')
    flushAllTimers()
    expect(clearHook.get().computeState).toBe('READY')
    expect(clearHook.get().resultStatus).toBe('OK')
    expect(countShadedCells(clearHook.get().readyResult)).toBe(0)
    clearHook.unmount()

    const blockedHook = renderUseRoofShading(makeArgs({ cacheRevision: 42, obstacles: [FULL_BLOCKER_OBSTACLE] }))
    expect(blockedHook.get().computeState).toBe('PENDING')
    flushAllTimers()
    expect(blockedHook.get().computeState).toBe('READY')
    expect(blockedHook.get().resultStatus).toBe('OK')
    expect(countShadedCells(blockedHook.get().readyResult)).toBe(16)
    blockedHook.unmount()
    vi.useRealTimers()
  })

  it('uses cached result when geometry/time fingerprints are unchanged', () => {
    vi.useFakeTimers()
    const hook = renderUseRoofShading(makeArgs({ datetimeIso: '2026-03-20T10:00:00Z' }))
    flushAllTimers()
    const firstResult = hook.get().readyResult

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
    expect(hook.get().readyResult).toBe(firstResult)
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    hook.unmount()
    vi.useRealTimers()
  })

  it('invalidates cache when cache revision changes', () => {
    vi.useFakeTimers()
    const hook = renderUseRoofShading(makeArgs({ cacheRevision: 43 }))
    flushAllTimers()
    const firstResult = hook.get().readyResult

    hook.rerender(makeArgs({ cacheRevision: 2 }))

    expect(hook.get().computeState).toBe('STALE')
    expect(hook.get().readyResult).toBe(firstResult)
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    flushAllTimers()

    expect(hook.get().computeState).toBe('READY')
    expect(hook.get().readyResult).not.toBe(firstResult)
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    hook.unmount()
    vi.useRealTimers()
  })

  it('recomputes and changes output when obstacle geometry changes', () => {
    vi.useFakeTimers()
    const hook = renderUseRoofShading(makeArgs({ cacheRevision: 44, obstacles: [] }))
    flushAllTimers()
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    hook.rerender(makeArgs({ cacheRevision: 44, obstacles: [FULL_BLOCKER_OBSTACLE] }))

    expect(hook.get().computeState).toBe('STALE')
    expect(countShadedCells(hook.get().readyResult)).toBe(0)

    flushAllTimers()

    expect(hook.get().computeState).toBe('READY')
    expect(countShadedCells(hook.get().readyResult)).toBe(16)

    hook.unmount()
    vi.useRealTimers()
  })
})
