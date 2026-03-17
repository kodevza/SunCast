import { planeSlopeFromPitchAzimuth } from '../../geometry/solver/metrics'
import { getAnnualMonthlyEnergyEstimate } from '../../geometry/sun/annualEstimation'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'

interface DeriveMonthlyProductionArgs {
  year: number
  timeZone: string
  selectedRoofs: SelectedRoofSunInput[]
  computationEnabled?: boolean
}

export function deriveMonthlyProduction({
  year,
  timeZone,
  selectedRoofs,
  computationEnabled = true,
}: DeriveMonthlyProductionArgs): number[] | null {
  if (!computationEnabled || selectedRoofs.length === 0) {
    return null
  }

  const totals = Array.from({ length: 12 }, () => 0)
  let hasData = false

  for (const roof of selectedRoofs) {
    const safeKwp = Number.isFinite(roof.kwp) && roof.kwp > 0 ? roof.kwp : 0
    if (safeKwp <= 0) {
      continue
    }

    const { p, q } = planeSlopeFromPitchAzimuth(roof.roofPitchDeg, roof.roofAzimuthDeg)
    const monthly = getAnnualMonthlyEnergyEstimate({
      year,
      timeZone,
      latDeg: roof.latDeg,
      lonDeg: roof.lonDeg,
      plane: { p, q, r: roof.roofPlane.r },
      stepMinutes: 15,
    })
    if (!monthly) {
      continue
    }

    hasData = true
    for (let monthIdx = 0; monthIdx < monthly.months.length; monthIdx += 1) {
      totals[monthIdx] += monthly.months[monthIdx].energyWhm2Estimate * (safeKwp / 1000)
    }
  }

  return hasData ? totals : null
}
