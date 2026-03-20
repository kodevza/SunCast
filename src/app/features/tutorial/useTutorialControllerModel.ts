import { useMemo } from 'react'
import type { TutorialState } from '../../editor-session/editorSession.types'
import type { useMapViewRuntime } from '../map-editor/MapView/useMapViewRuntime'
import type { useProjectStore } from '../../project-store/useProjectStore'
import type { SunCastTutorialModel } from './tutorial.types'

interface UseTutorialControllerModelArgs {
  project: ReturnType<typeof useProjectStore>
  mapView: ReturnType<typeof useMapViewRuntime>
  tutorial: TutorialState
}

export function useTutorialControllerModel({
  project,
  mapView,
  tutorial,
}: UseTutorialControllerModelArgs): SunCastTutorialModel {
  return useMemo(
    () => ({
      mapInitialized: mapView.mapInitialized,
      draftVertexCount: project.state.drawDraft.length,
      hasFinishedPolygon: Boolean(project.activeFootprint),
      kwp: project.activeFootprint?.kwp ?? null,
      hasEditedKwp: project.activeFootprint
        ? Boolean(tutorial.tutorialEditedKwpByFootprint[project.activeFootprint.id])
        : false,
      constrainedVertexCount: project.activeConstraints.vertexHeights.length,
      orbitEnabled: mapView.orbitEnabled,
      hasEditedDatetime: tutorial.tutorialDatetimeEdited,
      onReady: ({ startTutorial }) => {
        tutorial.setTutorialStart(startTutorial)
      },
    }),
    [
      mapView.mapInitialized,
      mapView.orbitEnabled,
      project.activeConstraints.vertexHeights.length,
      project.activeFootprint,
      project.state.drawDraft.length,
      tutorial,
    ],
  )
}
