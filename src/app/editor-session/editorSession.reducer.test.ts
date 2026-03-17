import { describe, expect, it } from 'vitest'
import { editorSessionReducer } from './editorSession.reducer'
import { initialProjectState } from '../../state/project-store/projectState.reducer'
import type { ProjectState } from '../../state/project-store/projectState.types'

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

describe('editorSessionReducer', () => {
  it('handles draw flow and commit selection', () => {
    let state = editorSessionReducer(initialProjectState, { type: 'START_DRAW' })
    state = editorSessionReducer(state, { type: 'ADD_DRAFT_POINT', point: [1, 1] })
    state = editorSessionReducer(state, { type: 'ADD_DRAFT_POINT', point: [2, 1] })
    state = editorSessionReducer(state, { type: 'ADD_DRAFT_POINT', point: [2, 2] })
    state = editorSessionReducer(
      {
        ...state,
        footprints: {
          created: {
            footprint: {
              id: 'created',
              vertices: [
                [1, 1],
                [2, 1],
                [2, 2],
              ],
              kwp: 4.3,
            },
            constraints: { vertexHeights: [] },
            pitchAdjustmentPercent: 0,
          },
        },
      },
      { type: 'COMMIT_FOOTPRINT' },
    )

    expect(state.isDrawing).toBe(false)
    expect(state.drawDraft).toEqual([])
    expect(state.activeFootprintId).toBe('created')
    expect(state.selectedFootprintIds).toEqual(['created'])
  })

  it('handles footprint selection flow', () => {
    let state = withFootprints(initialProjectState)
    state = editorSessionReducer(state, { type: 'TOGGLE_FOOTPRINT_SELECTION', footprintId: 'b' })
    expect(state.selectedFootprintIds).toEqual(['a', 'b'])
    expect(state.activeFootprintId).toBe('b')

    state = editorSessionReducer(state, { type: 'SELECT_ONLY_FOOTPRINT', footprintId: 'a' })
    expect(state.selectedFootprintIds).toEqual(['a'])
    expect(state.activeFootprintId).toBe('a')

    state = editorSessionReducer(state, { type: 'CLEAR_FOOTPRINT_SELECTION' })
    expect(state.selectedFootprintIds).toEqual([])
  })

  it('clears active footprint when active entry is deleted upstream', () => {
    const state = editorSessionReducer(
      {
        ...withFootprints(initialProjectState),
        footprints: {
          b: withFootprints(initialProjectState).footprints.b,
        },
        selectedFootprintIds: ['a', 'b'],
        activeFootprintId: 'a',
      },
      { type: 'DELETE_FOOTPRINT', footprintId: 'a' },
    )

    expect(state.activeFootprintId).toBeNull()
    expect(state.selectedFootprintIds).toEqual(['b'])
  })

  it('handles obstacle draw and selection flow', () => {
    let state = editorSessionReducer(initialProjectState, { type: 'START_OBSTACLE_DRAW' })
    state = editorSessionReducer(state, { type: 'ADD_OBSTACLE_DRAFT_POINT', point: [1, 1] })
    state = editorSessionReducer(state, { type: 'ADD_OBSTACLE_DRAFT_POINT', point: [2, 1] })
    state = editorSessionReducer(state, { type: 'ADD_OBSTACLE_DRAFT_POINT', point: [2, 2] })
    state = editorSessionReducer(
      {
        ...state,
        obstacles: {
          obstacle: {
            id: 'obstacle',
            kind: 'custom',
            shape: {
              type: 'polygon-prism',
              polygon: [
                [1, 1],
                [2, 1],
                [2, 2],
              ],
            },
            heightAboveGroundM: 8,
          },
        },
      },
      { type: 'COMMIT_OBSTACLE' },
    )

    expect(state.isDrawingObstacle).toBe(false)
    expect(state.obstacleDrawDraft).toEqual([])
    expect(state.activeObstacleId).toBe('obstacle')
    expect(state.selectedObstacleIds).toEqual(['obstacle'])
  })

  it('resets session state to defaults', () => {
    const state = editorSessionReducer(withFootprints(initialProjectState), { type: 'RESET_STATE' })

    expect(state.activeFootprintId).toBeNull()
    expect(state.selectedFootprintIds).toEqual([])
    expect(state.drawDraft).toEqual([])
    expect(state.isDrawing).toBe(false)
  })
})
