import type { DrawEditMode } from './DrawTools.types'

interface DrawToolsToolbarProps {
  editMode: DrawEditMode
  onSetEditMode: (mode: DrawEditMode) => void
}

const DRAW_MODES: Array<{ mode: DrawEditMode; label: string }> = [
  { mode: 'roof', label: 'Roof Mode' },
  { mode: 'obstacle', label: 'Obstacle Mode' },
]

export function DrawToolsToolbar({ editMode, onSetEditMode }: DrawToolsToolbarProps) {
  return (
    <div className="draw-mode-toggle" role="group" aria-label="Drawing mode">
      {DRAW_MODES.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          className={`draw-mode-button${editMode === mode ? ' draw-mode-button-active' : ''}`}
          onClick={() => onSetEditMode(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
