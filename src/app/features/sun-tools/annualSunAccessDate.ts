import { formatDateIsoParts, parseDateDdMmInput } from '../../../shared/utils/dateIsoUtc'

export const ANNUAL_SUN_ACCESS_SIMULATION_YEAR = 2026

export function annualSunAccessSimulationYear(): number {
  return ANNUAL_SUN_ACCESS_SIMULATION_YEAR
}

export function normalizeAnnualSunAccessDateRange(
  dateStartInput: string,
  dateEndInput: string,
  year = ANNUAL_SUN_ACCESS_SIMULATION_YEAR,
): { dateStartIso: string; dateEndIso: string } | null {
  const parsedStart = parseDateDdMmInput(dateStartInput)
  const parsedEnd = parseDateDdMmInput(dateEndInput)
  if (!parsedStart || !parsedEnd) {
    return null
  }

  const endYear = parsedEnd.year ?? year
  const startYear =
    parsedStart.year ??
    (parsedStart.month > parsedEnd.month || (parsedStart.month === parsedEnd.month && parsedStart.day > parsedEnd.day)
      ? year - 1
      : year)

  const dateStartIso = formatDateIsoParts(startYear, parsedStart.month, parsedStart.day)
  const dateEndIso = formatDateIsoParts(endYear, parsedEnd.month, parsedEnd.day)
  if (!dateStartIso || !dateEndIso || dateStartIso > dateEndIso) {
    return null
  }

  return { dateStartIso, dateEndIso }
}
