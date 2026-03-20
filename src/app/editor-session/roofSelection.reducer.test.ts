import { describe, expect, it } from 'vitest'
import { initialEditorSessionState, type EditorSessionState } from './editorSession.types'
import { roofSelectionReducer } from './roofSelection.reducer'

function withFootprints(state: EditorSessionState): EditorSessionState {
  return {
    ...state,
    activeFootprintId: 'a',
    selectedFootprintIds: ['a'],
  }
}

const baseState: EditorSessionState = {
  ...initialEditorSessionState,
}

describe('roofSelectionReducer', () => {
  it('handles footprint selection flow', () => {
    let state = withFootprints(baseState)
    state = roofSelectionReducer(state, { type: 'TOGGLE_FOOTPRINT_SELECTION', footprintId: 'b' })
    expect(state.selectedFootprintIds).toEqual(['a', 'b'])
    expect(state.activeFootprintId).toBe('b')

    state = roofSelectionReducer(state, { type: 'SELECT_ONLY_FOOTPRINT', footprintId: 'a' })
    expect(state.selectedFootprintIds).toEqual(['a'])
    expect(state.activeFootprintId).toBe('a')

    state = roofSelectionReducer(state, { type: 'CLEAR_FOOTPRINT_SELECTION' })
    expect(state.selectedFootprintIds).toEqual([])
  })

  it('does not require footprint existence checks', () => {
    const state = roofSelectionReducer(baseState, {
      type: 'SELECT_ONLY_FOOTPRINT',
      footprintId: 'missing',
    })

    expect(state.activeFootprintId).toBe('missing')
    expect(state.selectedFootprintIds).toEqual(['missing'])
  })
})
