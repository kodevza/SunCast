import { planeSlopeFromPitchAzimuth } from '../../geometry/solver/metrics'
import { getAnnualAggregatedDayProfile } from '../../geometry/sun/annualEstimation'
import { formatMinuteOfDay, scaleProfile, sumProfiles } from '../../geometry/sun/profileAggregation'
import type { SelectedRoofSunInput } from '../../types/presentation-contracts'

interface DeriveAnnualDayProfileArgs {
  year: number
  timeZone: string
  selectedRoofs: SelectedRoofSunInput[]
  computationEnabled?: boolean
}

export interface DerivedAnnualDayProfile {
  points: Array<{
    minuteOfDay: number
    timeLabel: string
    value: number
  }>
  meta: {
    dayCount: number
    sampledDayCount: number
    sampleWindowDays: number
    stepMinutes: number
    nonZeroBuckets: number
  }
}

export function deriveAnnualDayProfile({
  year,
  timeZone,
  selectedRoofs,
  computationEnabled = true,
}: DeriveAnnualDayProfileArgs): DerivedAnnualDayProfile | null {
  if (!computationEnabled || selectedRoofs.length === 0) {
    return null
  }

  const weightedProfiles = selectedRoofs
    .map((roof) => {
      const { p, q } = planeSlopeFromPitchAzimuth(roof.roofPitchDeg, roof.roofAzimuthDeg)
      const profile = getAnnualAggregatedDayProfile({
        year,
        timeZone,
        latDeg: roof.latDeg,
        lonDeg: roof.lonDeg,
        plane: { p, q, r: roof.roofPlane.r },
        stepMinutes: 15,
      })
      if (!profile) {
        return null
      }

      return {
        points: scaleProfile(
          profile.points.map((point) => ({ minuteOfDay: point.minuteOfDay, value: point.value })),
          roof.kwp / 1000,
        ),
        meta: profile.meta,
      }
    })
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))

  if (weightedProfiles.length === 0) {
    return null
  }

  const mergedPoints = sumProfiles(weightedProfiles.map((profile) => profile.points)).map((point) => ({
    minuteOfDay: point.minuteOfDay,
    timeLabel: formatMinuteOfDay(point.minuteOfDay),
    value: point.value,
  }))

  if (mergedPoints.length === 0) {
    return null
  }

  return {
    points: mergedPoints,
    meta: {
      dayCount: weightedProfiles[0].meta.dayCount,
      sampledDayCount: weightedProfiles[0].meta.sampledDayCount,
      sampleWindowDays: weightedProfiles[0].meta.sampleWindowDays,
      stepMinutes: weightedProfiles[0].meta.stepMinutes,
      nonZeroBuckets: mergedPoints.length,
    },
  }
}
