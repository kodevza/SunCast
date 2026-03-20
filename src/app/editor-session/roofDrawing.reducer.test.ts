import { describe, expect, it } from 'vitest'
import { initialEditorSessionState, type EditorSessionState } from './editorSession.types'
import { roofDrawingReducer } from './roofDrawing.reducer'

function withSelection(state: EditorSessionState): EditorSessionState {
  return {
    ...state,
    activeFootprintId: 'before',
    selectedFootprintIds: ['before'],
  }
}

const baseState: EditorSessionState = {
  ...initialEditorSessionState,
}

describe('roofDrawingReducer', () => {
  it('handles draw flow and commit selection', () => {
    let state = roofDrawingReducer(baseState, { type: 'START_DRAW' })
    state = roofDrawingReducer(state, { type: 'ADD_DRAFT_POINT', point: [1, 1] })
    state = roofDrawingReducer(state, { type: 'ADD_DRAFT_POINT', point: [2, 1] })
    state = roofDrawingReducer(state, { type: 'ADD_DRAFT_POINT', point: [2, 2] })
    state = roofDrawingReducer(withSelection(state), {
      type: 'ADD_FOOTPRINT',
    })

    expect(state.isDrawing).toBe(false)
    expect(state.drawDraft).toEqual([])
    expect(state.activeFootprintId).toBe('before')
    expect(state.selectedFootprintIds).toEqual(['before'])
  })

  it('cancels drawing without affecting selection state', () => {
    const state = roofDrawingReducer(
      {
        ...baseState,
        drawDraft: [[1, 1]],
        isDrawing: true,
        activeFootprintId: 'before',
        selectedFootprintIds: ['before'],
      },
      {
        type: 'CANCEL_DRAW',
      },
    )

    expect(state.activeFootprintId).toBe('before')
    expect(state.selectedFootprintIds).toEqual(['before'])
    expect(state.isDrawing).toBe(false)
    expect(state.drawDraft).toEqual([])
  })
})
