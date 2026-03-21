import { useEffect } from 'react'
import { runResetProjectFlow } from '../../shared/utils/projectRecovery'
import { reportAppSuccess } from '../../shared/errors'
import { toastActionService } from '../globalServices/toastActionService'
import type { ReturnTypeUseAnalysis, ReturnTypeUseProjectDocument } from './hookReturnTypes'
import type { GeometrySelectionState } from '../editor-session/editorSession.types'

interface UseGlobalToastActionsArgs {
  projectDocument: ReturnTypeUseProjectDocument
  geometrySelection: GeometrySelectionState
  analysis: ReturnTypeUseAnalysis
  onShareProject: () => Promise<void>
}

export function useGlobalToastActions({
  projectDocument,
  geometrySelection,
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
          clearSelectionState: geometrySelection.clearSelectionState,
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
  }, [analysis.setRequestedHeatmapMode, geometrySelection.clearSelectionState, onShareProject, store.resetState])
}
