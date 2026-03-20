import { describe, expect, it } from 'vitest'
import { initialEditorSessionState, type EditorSessionState } from './editorSession.types'
import { obstacleSelectionReducer } from './obstacleSelection.reducer'

function withSelection(state: EditorSessionState): EditorSessionState {
  return {
    ...state,
    activeObstacleId: 'a',
    selectedObstacleIds: ['a'],
  }
}

const baseState: EditorSessionState = {
  ...initialEditorSessionState,
}

describe('obstacleSelectionReducer', () => {
  it('handles obstacle selection flow', () => {
    let state = withSelection(baseState)
    state = obstacleSelectionReducer(state, { type: 'TOGGLE_OBSTACLE_SELECTION', obstacleId: 'b' })
    expect(state.selectedObstacleIds).toEqual(['a', 'b'])
    expect(state.activeObstacleId).toBe('b')

    state = obstacleSelectionReducer(state, { type: 'SELECT_ONLY_OBSTACLE', obstacleId: 'a' })
    expect(state.selectedObstacleIds).toEqual(['a'])
    expect(state.activeObstacleId).toBe('a')

    state = obstacleSelectionReducer(state, { type: 'CLEAR_OBSTACLE_SELECTION' })
    expect(state.selectedObstacleIds).toEqual([])
  })

  it('does not require obstacle existence checks', () => {
    const state = obstacleSelectionReducer(baseState, {
      type: 'SELECT_ONLY_OBSTACLE',
      obstacleId: 'missing',
    })

    expect(state.activeObstacleId).toBe('missing')
    expect(state.selectedObstacleIds).toEqual(['missing'])
  })
})
