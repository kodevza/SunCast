import type { SelectedRoofSunInput } from '../types/presentation-contracts'

export interface ForecastCliInput {
  createdDateTime: string
  roofs: SelectedRoofSunInput[]
}

function isIsoDateTimeWithTimezone(value: string): boolean {
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    return false
  }
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime())
}

/**
 * Creates the public input contract accepted by `suncast report`.
 * `createdDateTime` records when the export was created; the CLI derives its
 * UTC forecast date from this timestamp.
 */
export function createForecastCliInput(
  roofs: readonly SelectedRoofSunInput[],
  createdDateTime = new Date().toISOString(),
): ForecastCliInput {
  if (!isIsoDateTimeWithTimezone(createdDateTime)) {
    throw new Error('createdDateTime must be a valid ISO datetime with a timezone.')
  }
  if (roofs.length === 0) {
    throw new Error('At least one solved roof is required for a CLI report.')
  }
  return { createdDateTime, roofs: [...roofs] }
}
