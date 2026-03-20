// @vitest-environment jsdom
import { act, useEffect } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { useSidebarControllerModel } from './useSidebarControllerModel'

function renderHook(args: Parameters<typeof useSidebarControllerModel>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const latestRef: { current: ReturnType<typeof useSidebarControllerModel> | null } = { current: null }

  function Probe() {
    const latest = useSidebarControllerModel(args)

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

describe('useSidebarControllerModel', () => {
  it('shapes sidebar panel data from the narrow feature contract', () => {
    const clearSelectionState = vi.fn()
    const setConstraintLimitError = vi.fn()
    const setTutorialEditedKwpByFootprint = vi.fn()
    const selectOnlyFootprint = vi.fn()
    const selectOnlyObstacle = vi.fn()
    const toggleObstacleSelection = vi.fn()
    const setActiveFootprintKwp = vi.fn().mockReturnValue(true)
    const setActivePitchAdjustmentPercent = vi.fn().mockReturnValue(true)
    const setFootprintVertexHeight = vi.fn().mockReturnValue(true)
    const setFootprintEdgeHeight = vi.fn().mockReturnValue(true)
    const setObstacleHeight = vi.fn().mockReturnValue(true)
    const setObstacleKind = vi.fn().mockReturnValue(true)
    const deleteFootprint = vi.fn()
    const deleteObstacle = vi.fn()
    const clearFootprintSelection = vi.fn()
    const clearObstacleSelection = vi.fn()
    const clearFootprintVertexHeight = vi.fn()
    const clearFootprintEdgeHeight = vi.fn()

    const hook = renderHook({
      analysis: {
        solvedMetrics: {
          basePitchDeg: 30,
          azimuthDeg: 140,
          roofAreaM2: 12.5,
          minHeightM: 2,
          maxHeightM: 5,
          fitRmsErrorM: 0.125,
        },
        solvedRoofs: {
          entries: [],
          activeSolved: {
            footprintId: 'roof-a',
            solution: {
              plane: { p: 0.4, q: 0.3, r: 5 },
              vertexHeightsM: [],
              usedLeastSquares: false,
              rmsErrorM: 0.01,
              warnings: [{ code: 'CONSTRAINTS_RESIDUAL_HIGH', message: 'Check constraints' }],
            },
            mesh: { vertices: [], triangleIndices: [] },
            metrics: {
              pitchDeg: 30,
              azimuthDeg: 140,
              minHeightM: 2,
              maxHeightM: 5,
              roofAreaM2: 12.5,
            },
          },
          activeError: null,
        },
      },
      geometryEditing: {
        setConstraintLimitError,
      },
      geometrySelection: {
        clearSelectionState,
        safeSelectedEdgeIndex: 2,
        safeSelectedVertexIndex: 1,
      },
      project: {
        activeConstraints: { vertexHeights: [] },
        activeFootprint: {
          id: 'roof-a',
          vertices: [
            [0, 0],
            [4, 0],
            [0, 2],
          ],
          kwp: 7.2,
        },
        activeObstacle: {
          id: 'obstacle-a',
          kind: 'tree',
          shape: { type: 'tree', center: [1, 1], crownRadiusM: 2, trunkRadiusM: 0.2 },
          heightAboveGroundM: 3,
        },
        clearFootprintEdgeHeight,
        clearFootprintSelection,
        clearFootprintVertexHeight,
        clearObstacleSelection,
        deleteFootprint,
        deleteObstacle,
        obstacles: [
          {
            id: 'obstacle-a',
            kind: 'tree',
            shape: { type: 'tree', center: [1, 1], crownRadiusM: 2, trunkRadiusM: 0.2 },
            heightAboveGroundM: 3,
          },
        ],
        selectedFootprintIds: ['roof-a'],
        selectOnlyFootprint,
        selectOnlyObstacle,
        setActiveFootprintKwp,
        setActivePitchAdjustmentPercent,
        setFootprintEdgeHeight,
        setFootprintVertexHeight,
        setObstacleHeight,
        setObstacleKind,
        state: {
          activeFootprintId: 'roof-a',
          activeObstacleId: 'obstacle-a',
          footprints: {
            'roof-a': {
              footprint: {
                id: 'roof-a',
                vertices: [
                  [0, 0],
                  [4, 0],
                  [0, 2],
                ],
                kwp: 7.2,
              },
              constraints: { vertexHeights: [] },
              pitchAdjustmentPercent: 15,
            },
          },
          selectedObstacleIds: ['obstacle-a'],
        },
        toggleObstacleSelection,
      },
      tutorial: {
        setTutorialEditedKwpByFootprint,
      },
    })

    expect(hook.get().footprintPanel.footprints).toEqual([
      {
        id: 'roof-a',
        vertices: [
          [0, 0],
          [4, 0],
          [0, 2],
        ],
        kwp: 7.2,
      },
    ])
    expect(hook.get().roofEditor.selectedVertexIndex).toBe(1)
    expect(hook.get().roofEditor.selectedEdgeIndex).toBe(2)
    expect(hook.get().statusPanel.pitchAdjustmentPercent).toBe(15)
    expect(hook.get().statusPanel.adjustedPitchDeg).toBe(34.5)
    expect(hook.get().statusPanel.activeFootprintLatDeg).toBeCloseTo(0.6666666667)
    expect(hook.get().statusPanel.activeFootprintLonDeg).toBeCloseTo(1.3333333333)

    act(() => {
      hook.get().statusPanel.onSetPitchAdjustmentPercent(250)
    })
    expect(setActivePitchAdjustmentPercent).toHaveBeenCalledWith(200)

    act(() => {
      hook.get().footprintPanel.onSetActiveFootprintKwp(8.5)
    })
    expect(setActiveFootprintKwp).toHaveBeenCalledWith(8.5)
    expect(setTutorialEditedKwpByFootprint).toHaveBeenCalledWith(expect.any(Function))

    act(() => {
      hook.get().roofEditor.onConstraintLimitExceeded()
    })
    expect(setConstraintLimitError).toHaveBeenCalledTimes(1)

    act(() => {
      hook.get().obstaclePanel.onSelectObstacle('obstacle-a', true)
    })
    expect(toggleObstacleSelection).toHaveBeenCalledWith('obstacle-a')
    expect(clearSelectionState).toHaveBeenCalledTimes(1)

    act(() => {
      hook.get().footprintPanel.onDeleteActiveFootprint()
    })
    expect(deleteFootprint).toHaveBeenCalledWith('roof-a')

    act(() => {
      hook.get().obstaclePanel.onDeleteActiveObstacle()
    })
    expect(deleteObstacle).toHaveBeenCalledWith('obstacle-a')

    act(() => {
      hook.get().roofEditor.onSetVertex(0, 4)
      hook.get().roofEditor.onSetEdge(0, 4)
      hook.get().roofEditor.onClearVertex(0)
      hook.get().roofEditor.onClearEdge(0)
    })
    expect(setFootprintVertexHeight).toHaveBeenCalledWith('roof-a', 0, 4)
    expect(setFootprintEdgeHeight).toHaveBeenCalledWith('roof-a', 0, 4)
    expect(clearFootprintVertexHeight).toHaveBeenCalledWith('roof-a', 0)
    expect(clearFootprintEdgeHeight).toHaveBeenCalledWith('roof-a', 0)

    act(() => {
      hook.get().obstaclePanel.onSetActiveObstacleKind('pole')
      hook.get().obstaclePanel.onSetActiveObstacleHeight(6)
    })
    expect(setObstacleKind).toHaveBeenCalledWith('obstacle-a', 'pole')
    expect(setObstacleHeight).toHaveBeenCalledWith('obstacle-a', 6)

    expect(hook.get().statusPanel.warnings).toEqual([
      { code: 'CONSTRAINTS_RESIDUAL_HIGH', message: 'Check constraints' },
    ])
    hook.unmount()
  })
})
