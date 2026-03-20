import type { ReturnTypeUseAnalysis, ReturnTypeUseProjectDocument } from '../hooks/hookReturnTypes'
import { prepareActiveFootprintGeometry } from '../hooks/activeFootprintGeometry'
import { useSunCastEffects } from '../hooks/useSunCastEffects'
import type { useObstacleMeshResults } from '../hooks/useObstacleMeshResults'
import { useShareProjectAction } from '../features/share-project/useShareProjectAction'
import type { GeometryEditingState, GeometrySelectionState } from '../editor-session/editorSession.types'

interface SunCastEffectsProps {
  project: ReturnTypeUseProjectDocument
  geometrySelection: GeometrySelectionState
  geometryEditing: GeometryEditingState
  analysis: ReturnTypeUseAnalysis
  obstacleMeshResults: ReturnType<typeof useObstacleMeshResults>['obstacleMeshResults']
}

export function SunCastEffects({ project, geometrySelection, geometryEditing, analysis, obstacleMeshResults }: SunCastEffectsProps) {
  const activeFootprintErrors = prepareActiveFootprintGeometry(project.activeFootprint).activeFootprintErrors
  const shareProject = useShareProjectAction(project)

  useSunCastEffects({
    projectDocument: project,
    geometrySelection,
    geometryEditing,
    analysis,
    activeFootprintErrors,
    obstacleMeshResults,
    onShareProject: shareProject.onShareProject,
  })

  return null
}
