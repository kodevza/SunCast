import { describe, expect, it } from 'vitest'
import { editorSessionReducer } from './editorSession.reducer'
import type { ProjectStoreState } from '../project-store/projectStore.types'
import { initialEditorSessionState, type EditorAction } from './editorSession.types'
import { initialProjectState } from '../../state/project-store/projectState.reducer'

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
  } as ProjectStoreState
}

const baseState = {
  ...initialProjectState,
  ...initialEditorSessionState,
} as ProjectStoreState

function applySessionReducer(state: ProjectStoreState, action: EditorAction): ProjectStoreState {
  return {
    ...state,
    ...editorSessionReducer(state, action),
  }
}

describe('editorSessionReducer', () => {
  it('handles footprint selection flow', () => {
    let state = withFootprints(baseState)
    state = applySessionReducer(state, { type: 'TOGGLE_FOOTPRINT_SELECTION', footprintId: 'b' })
    expect(state.selectedFootprintIds).toEqual(['a', 'b'])
    expect(state.activeFootprintId).toBe('b')

    state = applySessionReducer(state, { type: 'SELECT_ONLY_FOOTPRINT', footprintId: 'a' })
    expect(state.selectedFootprintIds).toEqual(['a'])
    expect(state.activeFootprintId).toBe('a')

    state = applySessionReducer(state, { type: 'CLEAR_FOOTPRINT_SELECTION' })
    expect(state.selectedFootprintIds).toEqual([])
  })

  it('ignores select-all at the session reducer boundary', () => {
    const state = applySessionReducer(withFootprints(baseState), { type: 'SELECT_ALL_FOOTPRINTS' })

    expect(state.selectedFootprintIds).toEqual(['a'])
    expect(state.activeFootprintId).toBe('a')
  })

  it('clears the active footprint when toggling off the active selection', () => {
    const state = applySessionReducer(
      withFootprints(baseState),
      { type: 'TOGGLE_FOOTPRINT_SELECTION', footprintId: 'a' },
    )

    expect(state.activeFootprintId).toBeNull()
    expect(state.selectedFootprintIds).toEqual([])
  })

  it('resets session state to defaults', () => {
    const state = applySessionReducer(withFootprints(baseState), { type: 'RESET_STATE' })

    expect(state.activeFootprintId).toBeNull()
    expect(state.selectedFootprintIds).toEqual([])
    expect(state.drawDraft).toEqual([])
    expect(state.isDrawing).toBe(false)
  })
})
