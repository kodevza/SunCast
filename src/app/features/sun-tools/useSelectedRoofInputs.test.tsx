// @vitest-environment jsdom
import { act, useEffect } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSelectedRoofInputs } from './useSelectedRoofInputs'

function renderHook(args: Parameters<typeof useSelectedRoofInputs>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const latestRef: { current: ReturnType<typeof useSelectedRoofInputs> | null } = { current: null }

  function Probe() {
    const latest = useSelectedRoofInputs(args)

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

describe('useSelectedRoofInputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shapes feature-facing sun inputs from project selection and solved roofs', () => {
    const hook = renderHook({
      project: {
        selectedFootprintIds: ['roof-b', 'roof-a'],
        state: {
          footprints: {
            'roof-a': {
              footprint: {
                id: 'roof-a',
                vertices: [
                  [0, 0],
                  [6, 0],
                  [0, 3],
                ],
                kwp: 7.5,
              },
              pitchAdjustmentPercent: 250,
            },
            'roof-b': {
              footprint: {
                id: 'roof-b',
                vertices: [],
                kwp: 4,
              },
              pitchAdjustmentPercent: -120,
            },
          },
        },
      },
      analysis: {
        solvedRoofs: {
          entries: [
            {
              footprintId: 'roof-b',
              solution: {
                plane: { p: 0.2, q: 0.1, r: 4 },
                vertexHeightsM: [],
                usedLeastSquares: false,
                rmsErrorM: 0,
                warnings: [],
              },
              mesh: { vertices: [], triangleIndices: [] },
              metrics: {
                pitchDeg: 20,
                azimuthDeg: 110,
                minHeightM: 0,
                maxHeightM: 1,
                roofAreaM2: 1,
              },
            },
            {
              footprintId: 'roof-a',
              solution: {
                plane: { p: 0.4, q: 0.3, r: 5 },
                vertexHeightsM: [],
                usedLeastSquares: false,
                rmsErrorM: 0,
                warnings: [],
              },
              mesh: { vertices: [], triangleIndices: [] },
              metrics: {
                pitchDeg: 30,
                azimuthDeg: 140,
                minHeightM: 0,
                maxHeightM: 1,
                roofAreaM2: 1,
              },
            },
          ],
        },
      },
    } as unknown as Parameters<typeof useSelectedRoofInputs>[0])

    expect(hook.get()).toHaveLength(1)
    expect(hook.get()[0]).toMatchObject({
      footprintId: 'roof-a',
      lonDeg: 2,
      latDeg: 1,
      kwp: 7.5,
      roofPitchDeg: 90,
      roofAzimuthDeg: 140,
      roofPlane: { p: 0.4, q: 0.3, r: 5 },
    })

    hook.unmount()
  })
})
