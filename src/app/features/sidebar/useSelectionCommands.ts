import { useMemo } from 'react'
import type { GeometrySelectionState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'

export interface SelectionCommands {
  selectFootprint: (footprintId: string, multiSelect: boolean) => void
  selectObstacle: (obstacleId: string, multiSelect: boolean) => void
  clearSelection: () => void
}

interface UseSelectionCommandsArgs {
  project: ReturnType<typeof useProjectStore>
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useSelectionCommands({ project, geometrySelection }: UseSelectionCommandsArgs): SelectionCommands {
  return useMemo(
    () => ({
      selectFootprint: (footprintId: string, multiSelect: boolean) => {
        if (multiSelect) {
          console.error("not implemented");
        } else {
          project.selectOnlyFootprint(footprintId)
        }
        geometrySelection.clearSelectionState()
      },
      selectObstacle: (obstacleId: string, multiSelect: boolean) => {
        if (multiSelect) {
          project.toggleObstacleSelection(obstacleId)
        } else {
          project.selectOnlyObstacle(obstacleId)
        }
        geometrySelection.clearSelectionState()
      },
      clearSelection: () => {
        geometrySelection.clearSelectionState()
        project.clearFootprintSelection()
        project.clearObstacleSelection()
      },
    }),
    [geometrySelection, project],
  )
}
