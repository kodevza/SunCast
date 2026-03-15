import { HintTooltip } from '../../../components/HintTooltip'
import { DrawToolsHints } from './DrawToolsHints'
import { DrawToolsToolbar } from './DrawToolsToolbar'
import type { DrawToolsProps } from './DrawTools.types'
import { useDrawKeyboardShortcuts } from './hooks/useDrawKeyboardShortcuts'
import { useDrawToolsState } from './hooks/useDrawToolsState'

export function DrawTools(props: DrawToolsProps) {
  const { editMode, onSetEditMode } = props
  const state = useDrawToolsState(props)
  const isObstacleMode = editMode === 'obstacle'
  const currentState = isObstacleMode ? state.obstacle : state.roof

  const onStart = isObstacleMode ? props.onStartObstacleDrawing : props.onStartRoofDrawing
  const onUndo = isObstacleMode ? props.onUndoObstacleDrawing : props.onUndoRoofDrawing
  const onCancel = isObstacleMode ? props.onCancelObstacleDrawing : props.onCancelRoofDrawing
  const onCommit = isObstacleMode ? props.onCommitObstacleDrawing : props.onCommitRoofDrawing

  useDrawKeyboardShortcuts({
    enabled: currentState.isDrawing,
    canFinish: currentState.canFinish,
    onUndo,
    onFinish: onCommit,
  })

  return (
    <section className="panel-section">
      <h3 className="panel-heading-with-hint">
        {isObstacleMode ? 'Obstacle Polygon ' : 'Roof Polygon '}
        <HintTooltip
          hint={
            isObstacleMode
              ? 'Draw obstacle footprints for trees/buildings/poles. Set type and height in Obstacle panel.'
              : 'Click map to add vertices. Finish requires at least 3 points. Escape cancels drawing.'
          }
        >
          ?
        </HintTooltip>
      </h3>

      <DrawToolsToolbar editMode={editMode} onSetEditMode={onSetEditMode} />

      {!currentState.isDrawing ? (
        <button
          type="button"
          onClick={onStart}
          title={isObstacleMode ? 'Start obstacle polygon drawing mode.' : 'Start polygon drawing mode.'}
          data-testid={isObstacleMode ? 'draw-obstacle-button' : 'draw-footprint-button'}
        >
          {isObstacleMode ? 'Draw Obstacle Polygon' : 'Draw Roof Polygon'}
        </button>
      ) : (
        <div className="draw-actions">
          <DrawToolsHints editMode={editMode} isDrawing={currentState.isDrawing} pointCount={currentState.pointCount} />
          <button
            type="button"
            onClick={onUndo}
            disabled={currentState.pointCount === 0}
            title={isObstacleMode ? 'Remove the last obstacle draft vertex.' : 'Remove the last draft vertex.'}
            data-testid={isObstacleMode ? 'draw-obstacle-undo-button' : 'draw-undo-button'}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={!currentState.canFinish}
            title={isObstacleMode ? 'Commit obstacle polygon to project.' : 'Commit polygon to project.'}
            data-testid={isObstacleMode ? 'draw-obstacle-finish-button' : 'draw-finish-button'}
          >
            {isObstacleMode ? 'Finish Obstacle' : 'Finish Polygon'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            title={isObstacleMode ? 'Cancel obstacle drawing (Escape).' : 'Cancel drawing (Escape).'}
            data-testid={isObstacleMode ? 'draw-obstacle-cancel-button' : 'draw-cancel-button'}
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  )
}
