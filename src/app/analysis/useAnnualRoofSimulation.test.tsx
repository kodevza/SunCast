// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObstacleStateEntry } from '../../types/geometry'
import { useAnnualRoofSimulation, type AnnualSimulationOptions, type UseAnnualRoofSimulationArgs } from './useAnnualRoofSimulation'

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

function makeArgs(overrides: Partial<UseAnnualRoofSimulationArgs> = {}): UseAnnualRoofSimulationArgs {
  return {
    cacheRevision: 1,
    roofs: [
      {
        roofId: 'roof-1',
        polygon: FLAT_ROOF_POLYGON,
        vertexHeightsM: [1, 1, 1, 1],
      },
    ],
    obstacles: [],
    gridResolutionM: 1,
    timeZone: 'UTC',
    ...overrides,
  }
}

function renderHook(initialArgs: UseAnnualRoofSimulationArgs) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const latestRef: {
    current: ReturnType<typeof useAnnualRoofSimulation> | null
  } = { current: null }
  const argsRef: { current: UseAnnualRoofSimulationArgs } = { current: initialArgs }

  function Probe({ args }: { args: UseAnnualRoofSimulationArgs }) {
    const value = useAnnualRoofSimulation(args)
    const sharedRef = useRef(latestRef)
    useEffect(() => {
      sharedRef.current.current = value
    }, [value, sharedRef])
    return null
  }

  const rerender = (nextArgs?: UseAnnualRoofSimulationArgs) => {
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

const SINGLE_DAY_OPTIONS: AnnualSimulationOptions = {
  dateStartIso: '2026-06-21',
  dateEndIso: '2026-06-21',
  sampleWindowDays: 1,
  stepMinutes: 60,
  halfYearMirror: false,
}

describe('useAnnualRoofSimulation', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('computes deterministic annual metrics with real shading engine', async () => {
    vi.useFakeTimers()
    const hook = renderHook(makeArgs({ cacheRevision: 31 }))

    await act(async () => {
      const promise = hook.get().runSimulation(SINGLE_DAY_OPTIONS)
      await vi.runAllTimersAsync()
      await promise
    })

    const result = hook.get().result
    expect(hook.get().state).toBe('READY')
    expect(result).not.toBeNull()
    if (!result) {
      throw new Error('Expected simulation result')
    }

    expect(result.roofs).toHaveLength(1)
    expect(result.roofs[0].sunHours).toBe(11)
    expect(result.roofs[0].daylightHours).toBe(11)
    expect(result.roofs[0].frontSideHours).toBe(11)
    expect(result.roofs[0].sunAccessRatio).toBe(1)
    expect(result.roofs[0].litCellCountWeighted).toBe(176)
    expect(result.roofs[0].totalCellCountWeighted).toBe(176)

    expect(result.meta.sampledDayCount).toBe(1)
    expect(result.meta.simulatedHalfYear).toBe(false)
    expect(result.meta.stepMinutes).toBe(60)
    expect(result.meta.sampleWindowDays).toBe(1)
    expect(result.meta.dateStartIso).toBe('2026-06-21')
    expect(result.meta.dateEndIso).toBe('2026-06-21')

    expect(hook.get().heatmapFeatures).toHaveLength(16)
    expect(hook.get().heatmapFeatures.every((feature) => feature.properties.intensity === 1)).toBe(true)
    expect(hook.get().progress).toEqual({ ratio: 1, sampledDays: 1, totalSampledDays: 1 })

    hook.unmount()
    vi.useRealTimers()
  })

  it('uses cached result for identical geometry and options', async () => {
    vi.useFakeTimers()
    const hook = renderHook(makeArgs({ cacheRevision: 32 }))

    await act(async () => {
      const first = hook.get().runSimulation(SINGLE_DAY_OPTIONS)
      await vi.runAllTimersAsync()
      await first
    })

    const firstResult = hook.get().result
    const firstHeatmap = hook.get().heatmapFeatures

    await act(async () => {
      await hook.get().runSimulation(SINGLE_DAY_OPTIONS)
    })

    expect(hook.get().state).toBe('READY')
    expect(hook.get().result).toBe(firstResult)
    expect(hook.get().heatmapFeatures).toStrictEqual(firstHeatmap)
    expect(hook.get().result?.roofs[0].sunAccessRatio).toBe(1)

    hook.unmount()
    vi.useRealTimers()
  })

  it('invalidates cache when cache revision changes', async () => {
    vi.useFakeTimers()

    const firstHook = renderHook(makeArgs({ cacheRevision: 33 }))
    await act(async () => {
      const firstRun = firstHook.get().runSimulation(SINGLE_DAY_OPTIONS)
      await vi.runAllTimersAsync()
      await firstRun
    })
    const firstResult = firstHook.get().result
    firstHook.unmount()

    const secondHook = renderHook(makeArgs({ cacheRevision: 34 }))
    await act(async () => {
      const secondRun = secondHook.get().runSimulation(SINGLE_DAY_OPTIONS)
      await vi.runAllTimersAsync()
      await secondRun
    })

    expect(secondHook.get().state).toBe('READY')
    expect(secondHook.get().result).not.toBe(firstResult)
    expect(secondHook.get().result?.roofs[0].sunHours).toBe(11)
    expect(secondHook.get().result?.roofs[0].sunAccessRatio).toBe(1)

    secondHook.unmount()
    vi.useRealTimers()
  })

  it('returns validation error when date range is invalid', async () => {
    const hook = renderHook(makeArgs({ cacheRevision: 35 }))

    await act(async () => {
      await hook.get().runSimulation({
        dateStartIso: '2026-12-31',
        dateEndIso: '2026-01-01',
        sampleWindowDays: 1,
        stepMinutes: 60,
        halfYearMirror: false,
      })
    })

    expect(hook.get().state).toBe('ERROR')
    expect(hook.get().error).toContain('valid date range')
    expect(hook.get().result).toBeNull()
    expect(hook.get().heatmapFeatures).toEqual([])
    expect(hook.get().progress).toEqual({ ratio: 0, sampledDays: 0, totalSampledDays: 0 })

    hook.unmount()
  })

  it('updates business metrics when obstacle geometry blocks direct sun access', async () => {
    vi.useFakeTimers()
    const clearHook = renderHook(makeArgs({ cacheRevision: 36, obstacles: [] }))

    await act(async () => {
      const run = clearHook.get().runSimulation(SINGLE_DAY_OPTIONS)
      await vi.runAllTimersAsync()
      await run
    })

    expect(clearHook.get().result?.roofs[0].sunHours).toBe(11)
    expect(clearHook.get().result?.roofs[0].sunAccessRatio).toBe(1)
    clearHook.unmount()

    const blockedHook = renderHook(makeArgs({ cacheRevision: 37, obstacles: [FULL_BLOCKER_OBSTACLE] }))
    await act(async () => {
      const run = blockedHook.get().runSimulation(SINGLE_DAY_OPTIONS)
      await vi.runAllTimersAsync()
      await run
    })

    expect(blockedHook.get().state).toBe('READY')
    expect(blockedHook.get().result?.roofs[0].sunHours).toBe(0)
    expect(blockedHook.get().result?.roofs[0].frontSideHours).toBe(11)
    expect(blockedHook.get().result?.roofs[0].sunAccessRatio).toBe(0)
    expect(blockedHook.get().heatmapFeatures.every((feature) => feature.properties.intensity === 0)).toBe(true)

    blockedHook.unmount()
    vi.useRealTimers()
  })
})
