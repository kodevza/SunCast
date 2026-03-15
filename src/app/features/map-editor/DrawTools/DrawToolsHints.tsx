interface DrawToolsHintsProps {
  editMode: 'roof' | 'obstacle'
  isDrawing: boolean
  pointCount: number
}

export function DrawToolsHints({ editMode, isDrawing, pointCount }: DrawToolsHintsProps) {
  if (!isDrawing) {
    return null
  }

  const label = editMode === 'obstacle' ? 'obstacle vertices' : 'vertices'

  return (
    <p>
      Click on map to add {label} ({pointCount}). Enter = finish, Backspace/Ctrl+Z = undo.
    </p>
  )
}
