import { useMemo } from 'react'
import { useSelectionCommands } from './useSelectionCommands'
import { useFootprintCommands } from './useFootprintCommands'
import { useShareProjectAction } from '../share-project/useShareProjectAction'
import type { GeometrySelectionState, TutorialState } from '../../editor-session/editorSession.types'
import type { useProjectStore } from '../../project-store/useProjectStore'
import type { FootprintPanelProps } from './FootprintPanel'

interface UseFootprintPanelControllerArgs {
  project: ReturnType<typeof useProjectStore>
  tutorial: Pick<TutorialState, 'setTutorialEditedKwpByFootprint'>
  geometrySelection: Pick<GeometrySelectionState, 'clearSelectionState'>
}

export function useFootprintPanelController({
  project,
  tutorial,
  geometrySelection,
}: UseFootprintPanelControllerArgs): FootprintPanelProps {
  const selection = useSelectionCommands({ project, geometrySelection })
  const footprint = useFootprintCommands({ project, tutorial, geometrySelection })
  const shareProject = useShareProjectAction(project)
  const footprints = useMemo(
    () => Object.values(project.state.footprints).map((entry) => entry.footprint),
    [project.state.footprints],
  )

  return useMemo(
    () => ({
      footprints,
      activeFootprintId: project.state.activeFootprintId,
      selectedFootprintIds: project.selectedFootprintIds,
      activeFootprintKwp: project.activeFootprint?.kwp ?? null,
      onShareProject: shareProject.onShareProject,
      onSelectFootprint: selection.selectFootprint,
      onSetActiveFootprintKwp: footprint.setActiveFootprintKwp,
      onDeleteActiveFootprint: footprint.deleteActiveFootprint,
    }),
    [
      footprint.deleteActiveFootprint,
      footprint.setActiveFootprintKwp,
      project.activeFootprint,
      project.selectedFootprintIds,
      project.state.activeFootprintId,
      footprints,
      selection.selectFootprint,
      shareProject.onShareProject,
    ],
  )
}
