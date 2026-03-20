import { useMemo } from 'react'
import type { GeometrySelectionState, TutorialState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'
import { clampPitchAdjustmentPercent } from './statusPanel.types'

export interface FootprintCommands {
  setActiveFootprintKwp: (kwp: number) => void
  deleteActiveFootprint: () => void
  setPitchAdjustmentPercent: (pitchAdjustmentPercent: number) => void
}

interface UseFootprintCommandsArgs {
  project: ReturnType<typeof useProjectStore>
  tutorial: Pick<TutorialState, 'setTutorialEditedKwpByFootprint'>
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useFootprintCommands({
  project,
  tutorial,
  geometrySelection,
}: UseFootprintCommandsArgs): FootprintCommands {
  return useMemo(
    () => ({
      setActiveFootprintKwp: (kwp: number) => {
        project.setActiveFootprintKwp(kwp)
        const footprintId = project.state.activeFootprintId
        if (footprintId) {
          tutorial.setTutorialEditedKwpByFootprint((current) => ({ ...current, [footprintId]: true }))
        }
      },
      deleteActiveFootprint: () => {
        if (!project.state.activeFootprintId) {
          return
        }
        project.deleteFootprint(project.state.activeFootprintId)
        geometrySelection.clearSelectionState()
      },
      setPitchAdjustmentPercent: (pitchAdjustmentPercent: number) => {
        project.setActivePitchAdjustmentPercent(clampPitchAdjustmentPercent(pitchAdjustmentPercent))
      },
    }),
    [geometrySelection, project, tutorial],
  )
}
