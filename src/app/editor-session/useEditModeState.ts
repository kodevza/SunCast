import { useState } from 'react'
import type { EditModeState } from './editorSession.types'

export function useEditModeState(): EditModeState {
  const [editMode, setEditMode] = useState<'roof' | 'obstacle'>('roof')

  return {
    editMode,
    setEditMode,
  }
}
