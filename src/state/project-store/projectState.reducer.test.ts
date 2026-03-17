import { describe, expect, it } from 'vitest'
import type { ProjectState } from './projectState.types'
import { initialProjectState, projectStateReducer } from './projectState.reducer'

function withFootprints(state: ProjectState): ProjectState {
  return {
    ...state,
    footprints: {
      a: {
        footprint: {
          id: 'a',
          vertices: [
            [1, 1],
            [2, 1],
            [2, 2],
          ],
          kwp: 4,
        },
        constraints: { vertexHeights: [{ vertexIndex: 0, heightM: 1.2 }] },
        pitchAdjustmentPercent: 0,
      },
      b: {
        footprint: {
          id: 'b',
          vertices: [
            [10, 10],
            [11, 10],
            [11, 11],
          ],
          kwp: 5,
        },
        constraints: { vertexHeights: [] },
        pitchAdjustmentPercent: 0,
      },
    },
    activeFootprintId: 'a',
    selectedFootprintIds: ['a'],
  }
}

describe('projectStateReducer', () => {
  it('commits a footprint from the current draft without mutating session state', () => {
    const state = projectStateReducer(
      {
        ...initialProjectState,
        activeFootprintId: 'before',
        selectedFootprintIds: ['before'],
        drawDraft: [
          [1, 1],
          [2, 1],
          [2, 2],
        ],
        isDrawing: true,
      },
      { type: 'COMMIT_FOOTPRINT' },
    )

    expect(Object.keys(state.footprints)).toHaveLength(1)
    expect(state.activeFootprintId).toBe('before')
    expect(state.selectedFootprintIds).toEqual(['before'])
    expect(state.drawDraft).toEqual([
      [1, 1],
      [2, 1],
      [2, 2],
    ])
    expect(state.isDrawing).toBe(true)
  })

  it('deletes footprint geometry without reconciling session selection', () => {
    let state = withFootprints(initialProjectState)
    state = projectStateReducer(state, { type: 'DELETE_FOOTPRINT', footprintId: 'a' })

    expect(Object.keys(state.footprints)).toEqual(['b'])
    expect(state.activeFootprintId).toBe('a')
    expect(state.selectedFootprintIds).toEqual(['a'])
  })

  it('moves vertex and edge on active footprint', () => {
    let state = withFootprints(initialProjectState)
    state = projectStateReducer(state, { type: 'MOVE_VERTEX', payload: { vertexIndex: 1, point: [20, 30] } })
    expect(state.footprints.a.footprint.vertices[1]).toEqual([20, 30])

    state = projectStateReducer(state, { type: 'MOVE_EDGE', payload: { edgeIndex: 1, delta: [1, -2] } })
    expect(state.footprints.a.footprint.vertices[1]).toEqual([21, 28])
    expect(state.footprints.a.footprint.vertices[2]).toEqual([3, 0])
  })

  it('applies and clears edge-height semantics through vertex constraints', () => {
    let state = withFootprints(initialProjectState)
    state = projectStateReducer(state, { type: 'SET_EDGE_HEIGHT', payload: { edgeIndex: 1, heightM: 3.5 } })

    expect(state.footprints.a.constraints.vertexHeights).toEqual([
      { vertexIndex: 0, heightM: 1.2 },
      { vertexIndex: 1, heightM: 3.5 },
      { vertexIndex: 2, heightM: 3.5 },
    ])

    state = projectStateReducer(state, { type: 'CLEAR_EDGE_HEIGHT', edgeIndex: 1 })
    expect(state.footprints.a.constraints.vertexHeights).toEqual([{ vertexIndex: 0, heightM: 1.2 }])
  })

  it('updates active pitch adjustment percent without clamping', () => {
    let state = withFootprints(initialProjectState)
    state = projectStateReducer(state, { type: 'SET_ACTIVE_PITCH_ADJUSTMENT_PERCENT', pitchAdjustmentPercent: 15.5 })
    expect(state.footprints.a.pitchAdjustmentPercent).toBe(15.5)

    state = projectStateReducer(state, { type: 'SET_ACTIVE_PITCH_ADJUSTMENT_PERCENT', pitchAdjustmentPercent: 999 })
    expect(state.footprints.a.pitchAdjustmentPercent).toBe(999)
  })

  it('commits and edits obstacle geometry without session selection side effects', () => {
    let state = {
      ...initialProjectState,
      obstacleDrawDraft: [
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      isDrawingObstacle: true,
    }
    state = projectStateReducer(state, { type: 'COMMIT_OBSTACLE' })

    const obstacleId = state.activeObstacleId
    expect(Object.keys(state.obstacles)).toHaveLength(1)
    expect(obstacleId).toBeNull()
    expect(state.isDrawingObstacle).toBe(true)
    expect(state.selectedObstacleIds).toEqual([])

    state = projectStateReducer(state, {
      type: 'SET_OBSTACLE_HEIGHT',
      payload: { obstacleId: Object.keys(state.obstacles)[0] ?? '', heightAboveGroundM: 12 },
    })
    state = projectStateReducer(state, {
      type: 'SET_OBSTACLE_KIND',
      payload: { obstacleId: Object.keys(state.obstacles)[0] ?? '', kind: 'tree' },
    })
    state = projectStateReducer(state, {
      type: 'MOVE_OBSTACLE_VERTEX',
      payload: { obstacleId: Object.keys(state.obstacles)[0] ?? '', vertexIndex: 1, point: [3, 1.5] },
    })

    const createdObstacleId = Object.keys(state.obstacles)[0] ?? ''
    expect(state.obstacles[createdObstacleId].heightAboveGroundM).toBe(12)
    expect(state.obstacles[createdObstacleId].kind).toBe('tree')
    expect(state.obstacles[createdObstacleId].shape.type).toBe('tree')

    state = projectStateReducer(state, { type: 'DELETE_OBSTACLE', obstacleId: createdObstacleId })
    expect(state.activeObstacleId).toBeNull()
    expect(state.selectedObstacleIds).toEqual([])
    expect(Object.keys(state.obstacles)).toHaveLength(0)
  })

  it('throws when load payload is invalid', () => {
    const dirtyState: ProjectState = {
      ...initialProjectState,
      footprints: {
        a: {
          footprint: {
            id: '',
            vertices: [
              [1, 1],
              [2, 1],
              [2, 2],
            ],
            kwp: Number.NaN,
          },
          constraints: {
            vertexHeights: [
              { vertexIndex: 2, heightM: 2 },
              { vertexIndex: -1, heightM: 9 },
              { vertexIndex: 2, heightM: 3 },
            ],
          },
          pitchAdjustmentPercent: Number.NaN,
        },
      },
      activeFootprintId: 'missing',
      selectedFootprintIds: ['missing', 'a'],
      sunProjection: {
        enabled: undefined as unknown as boolean,
        datetimeIso: undefined as unknown as string,
        dailyDateIso: undefined as unknown as string,
      },
    }

    expect(() => projectStateReducer(initialProjectState, { type: 'LOAD', payload: dirtyState })).toThrow()
  })

  it('resets project state to defaults', () => {
    const state = projectStateReducer(withFootprints(initialProjectState), { type: 'RESET_STATE' })
    expect(state).toEqual(initialProjectState)
  })
})
