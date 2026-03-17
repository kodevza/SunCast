import { clearShareHashPayloadFromLocation } from '../../app/globalServices/shareService'

export interface RunResetProjectFlowArgs {
  resetState: () => void
  clearSelectionState: () => void
  setRequestedHeatmapMode: (mode: 'live-shading') => void
  onSuccess: () => void
}

export function runResetProjectFlow({
  resetState,
  clearSelectionState,
  setRequestedHeatmapMode,
  onSuccess,
}: RunResetProjectFlowArgs): void {
  resetState()
  clearSelectionState()
  setRequestedHeatmapMode('live-shading')
  clearShareHashPayloadFromLocation(window.location)
  onSuccess()
}
