import { describe, expect, it } from 'vitest'
import type { ProjectStoreState } from '../../app/project-store/projectStore.types'
import { initialEditorSessionState } from '../../app/editor-session/editorSession.types'
import { initialProjectState, projectStateReducer } from './projectState.reducer'

function withFootprints(state: ProjectStoreState): ProjectStoreState {
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

const baseState: ProjectStoreState = {
  ...initialProjectState,
  ...initialEditorSessionState,
}

describe('projectStateReducer', () => {
  it('adds a footprint without mutating session state', () => {
    const state = projectStateReducer(
      {
        ...baseState,
        activeFootprintId: 'before',
        selectedFootprintIds: ['before'],
        drawDraft: [
          [1, 1],
          [2, 1],
          [2, 2],
        ],
        isDrawing: true,
      },
      {
        type: 'ADD_FOOTPRINT',
        payload: {
          footprint: {
            id: 'new-footprint',
            vertices: [
              [1, 1],
              [2, 1],
              [2, 2],
            ],
            kwp: 4.3,
          },
        },
      },
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
    let state = withFootprints(baseState)
    state = projectStateReducer(state, { type: 'DELETE_FOOTPRINT', footprintId: 'a' })

    expect(Object.keys(state.footprints)).toEqual(['b'])
    expect(state.activeFootprintId).toBe('a')
    expect(state.selectedFootprintIds).toEqual(['a'])
  })

  it('moves vertex and edge on active footprint', () => {
    let state = withFootprints(baseState)
    state = projectStateReducer(state, {
      type: 'MOVE_FOOTPRINT_VERTEX',
      payload: { footprintId: 'a', vertexIndex: 1, point: [20, 30] },
    })
    expect(state.footprints.a.footprint.vertices[1]).toEqual([20, 30])

    state = projectStateReducer(state, {
      type: 'MOVE_FOOTPRINT_EDGE',
      payload: { footprintId: 'a', edgeIndex: 1, delta: [1, -2] },
    })
    expect(state.footprints.a.footprint.vertices[1]).toEqual([21, 28])
    expect(state.footprints.a.footprint.vertices[2]).toEqual([3, 0])
  })

  it('applies scoped footprint height and clear actions to the targeted footprint only', () => {
    let state = withFootprints(baseState)

    state = projectStateReducer(state, {
      type: 'SET_FOOTPRINT_VERTEX_HEIGHTS',
      payload: {
        footprintId: 'b',
        constraints: [{ vertexIndex: 1, heightM: 3.5 }],
      },
    })
    state = projectStateReducer(state, {
      type: 'SET_FOOTPRINT_VERTEX_HEIGHTS',
      payload: {
        footprintId: 'b',
        constraints: [
          { vertexIndex: 0, heightM: 2.25 },
          { vertexIndex: 2, heightM: 4.75 },
        ],
      },
    })
    state = projectStateReducer(state, {
      type: 'SET_FOOTPRINT_EDGE_HEIGHT',
      payload: { footprintId: 'b', edgeIndex: 1, heightM: 6.5 },
    })

    expect(state.footprints.a.constraints.vertexHeights).toEqual([{ vertexIndex: 0, heightM: 1.2 }])
    expect(state.footprints.b.constraints.vertexHeights).toEqual([
      { vertexIndex: 0, heightM: 2.25 },
      { vertexIndex: 1, heightM: 6.5 },
      { vertexIndex: 2, heightM: 6.5 },
    ])

    state = projectStateReducer(state, {
      type: 'CLEAR_FOOTPRINT_VERTEX_HEIGHT',
      payload: { footprintId: 'b', vertexIndex: 1 },
    })
    state = projectStateReducer(state, {
      type: 'CLEAR_FOOTPRINT_EDGE_HEIGHT',
      payload: { footprintId: 'b', edgeIndex: 1 },
    })

    expect(state.footprints.a.constraints.vertexHeights).toEqual([{ vertexIndex: 0, heightM: 1.2 }])
    expect(state.footprints.b.constraints.vertexHeights).toEqual([{ vertexIndex: 0, heightM: 2.25 }])
  })

  it('updates scoped footprint fields without clamping', () => {
    let state = withFootprints(baseState)
    state = projectStateReducer(state, {
      type: 'SET_FOOTPRINT_KWP',
      payload: { footprintId: 'b', kwp: 9.75 },
    })
    state = projectStateReducer(state, {
      type: 'SET_FOOTPRINT_PITCH_ADJUSTMENT_PERCENT',
      payload: { footprintId: 'a', pitchAdjustmentPercent: 15.5 },
    })
    expect(state.footprints.b.footprint.kwp).toBe(9.75)
    expect(state.footprints.a.pitchAdjustmentPercent).toBe(15.5)

    state = projectStateReducer(state, {
      type: 'SET_FOOTPRINT_PITCH_ADJUSTMENT_PERCENT',
      payload: { footprintId: 'b', pitchAdjustmentPercent: 999 },
    })
    expect(state.footprints.b.pitchAdjustmentPercent).toBe(999)
    expect(state.footprints.a.pitchAdjustmentPercent).toBe(15.5)
  })

  it('commits and edits obstacle geometry without session selection side effects', () => {
    let state: ProjectStoreState = {
      ...baseState,
      obstacleDrawDraft: [
        [1, 1] as [number, number],
        [2, 1] as [number, number],
        [2, 2] as [number, number],
      ],
      isDrawingObstacle: true,
      activeObstacleId: 'before',
      selectedObstacleIds: ['before'],
    }
    state = projectStateReducer(state, {
      type: 'ADD_OBSTACLE',
      payload: {
        obstacle: {
          id: 'obstacle-1',
          kind: 'custom',
          shape: {
            type: 'polygon-prism',
            polygon: [
              [1, 1] as [number, number],
              [2, 1] as [number, number],
              [2, 2] as [number, number],
            ],
          },
          heightAboveGroundM: 8,
        },
      },
    })

    expect(Object.keys(state.obstacles)).toHaveLength(1)
    expect(state.activeObstacleId).toBe('before')
    expect(state.isDrawingObstacle).toBe(true)
    expect(state.selectedObstacleIds).toEqual(['before'])

    state = projectStateReducer(state, {
      type: 'SET_OBSTACLE_HEIGHT',
      payload: { obstacleId: 'obstacle-1', heightAboveGroundM: 12 },
    })
    state = projectStateReducer(state, {
      type: 'SET_OBSTACLE_KIND',
      payload: { obstacleId: 'obstacle-1', kind: 'tree' },
    })
    state = projectStateReducer(state, {
      type: 'MOVE_OBSTACLE_VERTEX',
      payload: { obstacleId: 'obstacle-1', vertexIndex: 1, point: [3, 1.5] },
    })

    expect(state.obstacles['obstacle-1']?.heightAboveGroundM).toBe(12)
    expect(state.obstacles['obstacle-1']?.kind).toBe('tree')
    expect(state.obstacles['obstacle-1']?.shape.type).toBe('tree')

    state = projectStateReducer(state, { type: 'DELETE_OBSTACLE', obstacleId: 'obstacle-1' })
    expect(state.activeObstacleId).toBe('before')
    expect(state.selectedObstacleIds).toEqual(['before'])
    expect(Object.keys(state.obstacles)).toHaveLength(0)
  })

  it('throws when load payload is invalid', () => {
    const dirtyState: ProjectStoreState = {
      ...baseState,
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

    expect(() => projectStateReducer(baseState, { type: 'LOAD', payload: dirtyState })).toThrow()
  })

  it('resets project state to defaults', () => {
    const state = projectStateReducer(withFootprints(baseState), { type: 'RESET_STATE' })
    expect(state).toMatchObject(initialProjectState)
    expect(state.activeFootprintId).toBe('a')
    expect(state.selectedFootprintIds).toEqual(['a'])
  })
})
