import { describe, expect, it } from 'vitest'
import { initialEditorSessionState, type EditorSessionState } from './editorSession.types'
import { obstacleDrawingReducer } from './obstacleDrawing.reducer'

const baseState: EditorSessionState = {
  ...initialEditorSessionState,
}

describe('obstacleDrawingReducer', () => {
  it('handles draw flow and draft reset', () => {
    let state = obstacleDrawingReducer(baseState, { type: 'START_OBSTACLE_DRAW' })
    state = obstacleDrawingReducer(state, { type: 'ADD_OBSTACLE_DRAFT_POINT', point: [1, 1] })
    state = obstacleDrawingReducer(state, { type: 'ADD_OBSTACLE_DRAFT_POINT', point: [2, 1] })
    state = obstacleDrawingReducer(state, { type: 'ADD_OBSTACLE_DRAFT_POINT', point: [2, 2] })
    state = obstacleDrawingReducer(state, { type: 'CANCEL_OBSTACLE_DRAW' })

    expect(state.isDrawingObstacle).toBe(false)
    expect(state.obstacleDrawDraft).toEqual([])
  })

  it('clears obstacle draft on cancel and undo', () => {
    let state = obstacleDrawingReducer(
      {
        ...baseState,
        obstacleDrawDraft: [[1, 1], [2, 1]],
        isDrawingObstacle: true,
      },
      { type: 'UNDO_OBSTACLE_DRAFT_POINT' },
    )

    expect(state.obstacleDrawDraft).toEqual([[1, 1]])

    state = obstacleDrawingReducer(state, { type: 'CANCEL_OBSTACLE_DRAW' })

    expect(state.isDrawingObstacle).toBe(false)
    expect(state.obstacleDrawDraft).toEqual([])
  })
})
