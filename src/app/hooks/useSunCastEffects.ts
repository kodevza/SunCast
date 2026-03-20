import { useComputeProcessingToast } from './useComputeProcessingToast'
import { useEditorKeyboardShortcuts } from './useEditorKeyboardShortcuts'
import { useGlobalToastActions } from './useGlobalToastActions'
import { useObstacleMeshErrorReporting } from './useObstacleMeshErrorReporting'
import { useUiErrorReporting } from './useUiErrorReporting'
import type { ReturnTypeUseAnalysis, ReturnTypeUseProjectDocument } from './hookReturnTypes'
import type { useObstacleMeshResults } from './useObstacleMeshResults'
import type { GeometryEditingState, GeometrySelectionState } from '../editor-session/editorSession.types'

interface UseSunCastEffectsArgs {
  projectDocument: ReturnTypeUseProjectDocument
  geometrySelection: GeometrySelectionState
  geometryEditing: GeometryEditingState
  analysis: ReturnTypeUseAnalysis
  activeFootprintErrors: string[]
  obstacleMeshResults: ReturnType<typeof useObstacleMeshResults>['obstacleMeshResults']
  onShareProject: () => Promise<void>
}

export function useSunCastEffects({
  projectDocument,
  geometrySelection,
  geometryEditing,
  analysis,
  activeFootprintErrors,
  obstacleMeshResults,
  onShareProject,
}: UseSunCastEffectsArgs): void {
  useComputeProcessingToast(analysis.computeProcessingActive)
  useEditorKeyboardShortcuts(projectDocument, geometrySelection)
  useGlobalToastActions({ projectDocument, geometrySelection, analysis, onShareProject })
  useUiErrorReporting({ activeFootprintErrors, geometryEditing, analysis })
  useObstacleMeshErrorReporting(obstacleMeshResults)
}
