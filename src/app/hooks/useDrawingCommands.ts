import { useMemo } from 'react'
import { useSunCastAppContext } from '../screens/SunCastAppProvider'

export interface DrawingCommands {
  setEditMode: (mode: 'roof' | 'obstacle') => void
  startRoof: () => void
  undoRoof: () => void
  cancelRoof: () => void
  commitRoof: () => void
  startObstacle: () => void
  undoObstacle: () => void
  cancelObstacle: () => void
  commitObstacle: () => void
}

export function useDrawingCommands(): DrawingCommands {
  const { project, session } = useSunCastAppContext()

  return useMemo(
    () => ({
      setEditMode: (mode) => {
        session.setEditMode(mode)
        if (mode === 'roof' && project.state.isDrawingObstacle) {
          project.cancelObstacleDrawing()
        }
        if (mode === 'obstacle' && project.state.isDrawing) {
          project.cancelDrawing()
        }
      },
      startRoof: () => {
        session.setOrbitEnabled(false)
        project.cancelObstacleDrawing()
        session.clearSelectionState()
        project.startDrawing()
      },
      undoRoof: project.undoDraftPoint,
      cancelRoof: () => {
        project.cancelDrawing()
        session.clearSelectionState()
      },
      commitRoof: () => {
        project.commitFootprint()
        session.clearSelectionState()
      },
      startObstacle: () => {
        session.setOrbitEnabled(false)
        project.cancelDrawing()
        session.clearSelectionState()
        project.startObstacleDrawing()
      },
      undoObstacle: project.undoObstacleDraftPoint,
      cancelObstacle: () => {
        project.cancelObstacleDrawing()
        session.clearSelectionState()
      },
      commitObstacle: () => {
        project.commitObstacle()
        session.clearSelectionState()
      },
    }),
    [project, session],
  )
}
