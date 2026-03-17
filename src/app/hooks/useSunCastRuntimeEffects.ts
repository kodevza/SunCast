import { useComputeProcessingToast } from './useComputeProcessingToast'
import { useEditorKeyboardShortcuts } from './useEditorKeyboardShortcuts'
import { useGlobalToastActions } from './useGlobalToastActions'
import { useObstacleMeshErrorReporting } from './useObstacleMeshErrorReporting'
import type { useObstacleMeshResults } from './useObstacleMeshResults'
import { useUiErrorReporting } from './useUiErrorReporting'
import type { ReturnTypeUseAnalysis, ReturnTypeUseEditorSession, ReturnTypeUseProjectDocument } from './hookReturnTypes'

interface UseSunCastRuntimeEffectsArgs {
  projectDocument: ReturnTypeUseProjectDocument
  editorSession: ReturnTypeUseEditorSession
  analysis: ReturnTypeUseAnalysis
  activeFootprintErrors: string[]
  obstacleMeshResults: ReturnType<typeof useObstacleMeshResults>['obstacleMeshResults']
  onShareProject: () => Promise<void>
}

export function useSunCastRuntimeEffects({
  projectDocument,
  editorSession,
  analysis,
  activeFootprintErrors,
  obstacleMeshResults,
  onShareProject,
}: UseSunCastRuntimeEffectsArgs): void {
  useComputeProcessingToast(analysis.computeProcessingActive)
  useEditorKeyboardShortcuts(projectDocument, editorSession)
  useGlobalToastActions({ projectDocument, editorSession, analysis, onShareProject })
  useUiErrorReporting({ activeFootprintErrors, editorSession, analysis })
  useObstacleMeshErrorReporting(obstacleMeshResults)
}
