import { useEffect } from 'react'
import { runResetProjectFlow } from '../../application/services/projectRecovery'
import { reportAppSuccess } from '../../shared/errors'
import { toastActionService } from '../globalServices/toastActionService'
import type { ReturnTypeUseAnalysis, ReturnTypeUseEditorSession, ReturnTypeUseProjectDocument } from './hookReturnTypes'

interface UseGlobalToastActionsArgs {
  projectDocument: ReturnTypeUseProjectDocument
  editorSession: ReturnTypeUseEditorSession
  analysis: ReturnTypeUseAnalysis
  onShareProject: () => Promise<void>
}

export function useGlobalToastActions({
  projectDocument,
  editorSession,
  analysis,
  onShareProject,
}: UseGlobalToastActionsArgs): void {
  const store = projectDocument

  useEffect(() => {
    return toastActionService.subscribe((action) => {
      if (action === 'share-state') {
        void onShareProject()
        return
      }

      if (action === 'reset-state') {
        runResetProjectFlow({
          resetState: store.resetState,
          clearSelectionState: editorSession.clearSelectionState,
          setRequestedHeatmapMode: analysis.setRequestedHeatmapMode,
          onSuccess: () => {
            reportAppSuccess('Project state reset to defaults.', {
              area: 'global-error-toast',
              source: 'reset-state',
            })
          },
        })
      }
    })
  }, [analysis.setRequestedHeatmapMode, editorSession.clearSelectionState, onShareProject, store.resetState])
}
