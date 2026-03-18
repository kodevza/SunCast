import { useMemo } from 'react'
import { useSunCastAppContext } from '../../screens/SunCastAppProvider'
import type { SunCastTutorialModel } from './tutorial.types'

export function useTutorialControllerModel(): SunCastTutorialModel {
  const { project, session } = useSunCastAppContext()

  return useMemo(
    () => ({
      mapInitialized: session.mapInitialized,
      draftVertexCount: project.state.drawDraft.length,
      hasFinishedPolygon: Boolean(project.activeFootprint),
      kwp: project.activeFootprint?.kwp ?? null,
      hasEditedKwp: project.activeFootprint
        ? Boolean(session.tutorialEditedKwpByFootprint[project.activeFootprint.id])
        : false,
      constrainedVertexCount: project.activeConstraints.vertexHeights.length,
      orbitEnabled: session.orbitEnabled,
      hasEditedDatetime: session.tutorialDatetimeEdited,
      onReady: ({ startTutorial }) => {
        session.setTutorialStart(startTutorial)
      },
    }),
    [project.activeConstraints.vertexHeights.length, project.activeFootprint, project.state.drawDraft.length, session],
  )
}
