export const MIN_PITCH_ADJUSTMENT_PERCENT = -90
export const MAX_PITCH_ADJUSTMENT_PERCENT = 200

export function clampPitchAdjustmentPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(MAX_PITCH_ADJUSTMENT_PERCENT, Math.max(MIN_PITCH_ADJUSTMENT_PERCENT, value))
}
