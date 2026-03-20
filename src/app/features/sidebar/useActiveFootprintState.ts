export interface ActiveFootprintState {
  activeFootprintErrors: string[]
  activeFootprintCentroid: [number, number] | null
  activePitchAdjustmentPercent: number
  adjustedPitchDeg: number | null
}

interface UseActiveFootprintStateParams {
  activeFootprintErrors: string[]
  activeFootprintCentroid: [number, number] | null
  activePitchAdjustmentPercent: number
  basePitchDeg: number | null
}

export function useActiveFootprintState(
  params: UseActiveFootprintStateParams,
): ActiveFootprintState {
  const { activeFootprintErrors, activeFootprintCentroid, activePitchAdjustmentPercent, basePitchDeg } = params
  const adjustedPitchDeg =
    basePitchDeg === null ? null : basePitchDeg * (1 + activePitchAdjustmentPercent / 100)

  return {
    activeFootprintErrors,
    activeFootprintCentroid,
    activePitchAdjustmentPercent,
    adjustedPitchDeg,
  }
}
