import { useMemo, useState } from 'react'
import { useDerivedHeatmapMode } from './deriveHeatmapMode'
import { useDerivedShadingRoofs } from './deriveShadingRoofs'
import { useSolvedRoofEntries } from './useSolvedRoofEntries'
import { useAnnualRoofSimulation } from './useAnnualRoofSimulation'
import { useRoofShading } from './useRoofShading'
import { useSunProjectionState } from './useSunProjectionState'
import type { AnnualSunAccessResult } from '../../geometry/shading'
import type { LngLat } from '../../types/geometry'
import type { ObstacleStateEntry, ProjectSunProjectionSettings, ShadingSettings } from '../../types/geometry'
import type { FootprintStateEntry } from '../../state/project-store/projectState.types'
import type { AnalysisState, BinaryShadedCell } from './analysis.types'

interface UseAnalysisArgs {
  stateRevision: number
  footprintEntries: FootprintStateEntry[]
  footprintEntriesById: Record<string, FootprintStateEntry>
  activeFootprintId: string | null
  selectedFootprintIds: string[]
  activeFootprintVertices: Array<[number, number]> | null
  obstacles: ObstacleStateEntry[]
  sunProjection: ProjectSunProjectionSettings
  shadingSettings: ShadingSettings
  hasVertexOrEdgeSelection: boolean
  isGeometryDragActive: boolean
  setSunProjectionDatetimeIso: (datetimeIso: string | null) => void
  setSunProjectionDailyDateIso: (dailyDateIso: string | null) => void
}

function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length === 0) {
    return ring
  }

  const closedRing = [...ring]
  const [firstLon, firstLat] = closedRing[0]
  const [lastLon, lastLat] = closedRing[closedRing.length - 1]
  if (firstLon !== lastLon || firstLat !== lastLat) {
    closedRing.push([firstLon, firstLat])
  }
  return closedRing
}

function toBinaryShadedCellsFromAnnualResult(
  result: AnnualSunAccessResult | null,
): BinaryShadedCell[] {
  if (!result) {
    return []
  }

  return result.heatmapCells.flatMap((cell) => {
    if (cell.litRatio >= 1) {
      return []
    }

    return [
      {
        roofId: cell.roofId,
        cellPolygon: closeRing(cell.cellPolygon),
      },
    ]
  })
}

export function useAnalysis(args: UseAnalysisArgs) {
  const solved = useSolvedRoofEntries(args.footprintEntries, args.activeFootprintId)

  const shadingRoofs = useDerivedShadingRoofs({
    selectedFootprintIds: args.selectedFootprintIds,
    activeFootprintId: args.activeFootprintId,
    footprintEntries: args.footprintEntriesById,
    solvedEntries: solved.entries,
    obstacles: args.obstacles,
    datetimeIso: args.sunProjection.datetimeIso,
  })

  const productionComputationEnabled = !args.isGeometryDragActive && !args.hasVertexOrEdgeSelection

  const {
    sunDatetimeRaw,
    sunDailyDateRaw,
    sunDailyTimeZone,
    sunDatetimeError,
    hasValidSunDatetime,
    sunProjectionResult,
    onSunDatetimeInputChange,
  } = useSunProjectionState({
    sunProjection: args.sunProjection,
    activeVertices: args.activeFootprintVertices ?? null,
    activePlane: solved.activeSolved?.solution.plane ?? null,
    setSunProjectionDatetimeIso: args.setSunProjectionDatetimeIso,
    setSunProjectionDailyDateIso: args.setSunProjectionDailyDateIso,
  })

  const shadingResult = useRoofShading({
    cacheRevision: args.stateRevision,
    enabled: args.shadingSettings.enabled && args.sunProjection.enabled && hasValidSunDatetime && !args.isGeometryDragActive,
    roofs: shadingRoofs,
    obstacles: args.obstacles,
    datetimeIso: args.sunProjection.datetimeIso,
    gridResolutionM: args.shadingSettings.gridResolutionM,
    interactionActive: args.isGeometryDragActive,
  })

  const annualSimulation = useAnnualRoofSimulation({
    cacheRevision: args.stateRevision,
    roofs: shadingRoofs,
    obstacles: args.obstacles,
    gridResolutionM: args.shadingSettings.gridResolutionM,
    timeZone: sunDailyTimeZone,
  })

  const [requestedHeatmapMode, setRequestedHeatmapMode] = useState<'live-shading' | 'annual-sun-access' | 'none'>(
    'live-shading',
  )

  const activeHeatmapMode = useDerivedHeatmapMode({
    requestedHeatmapMode,
    annualSimulationState: annualSimulation.state,
    shadingEnabled: args.shadingSettings.enabled,
  })

  const annualHeatmapVisible =
    activeHeatmapMode === 'annual-sun-access' &&
    annualSimulation.state === 'READY' &&
    annualSimulation.heatmapFeatures.length > 0

  const mapCellsForMap =
    activeHeatmapMode === 'annual-sun-access' ? toBinaryShadedCellsFromAnnualResult(annualSimulation.result) : []

  const heatmapComputeStateForMap =
    activeHeatmapMode === 'annual-sun-access'
      ? annualSimulation.state === 'RUNNING'
        ? ('PENDING' as const)
        : annualSimulation.state === 'READY'
          ? ('READY' as const)
          : ('IDLE' as const)
      : shadingResult.computeState

  const heatmapEnabledForMap =
    activeHeatmapMode === 'annual-sun-access'
      ? annualSimulation.state === 'READY'
      : activeHeatmapMode === 'live-shading'
        ? args.shadingSettings.enabled
        : false

  const computeProcessingActive =
    shadingResult.computeState === 'PENDING' || shadingResult.computeState === 'STALE' || annualSimulation.state === 'RUNNING'

  const basePitchDeg = solved.activeSolved?.metrics.pitchDeg ?? null
  const solvedMetrics = useMemo(
    () => ({
      basePitchDeg,
      azimuthDeg: solved.activeSolved?.metrics.azimuthDeg ?? null,
      roofAreaM2: solved.activeSolved?.metrics.roofAreaM2 ?? null,
      minHeightM: solved.activeSolved?.metrics.minHeightM ?? null,
      maxHeightM: solved.activeSolved?.metrics.maxHeightM ?? null,
      fitRmsErrorM: solved.activeSolved?.solution.rmsErrorM ?? null,
    }),
    [basePitchDeg, solved.activeSolved],
  )

  const warnings = solved.activeSolved?.solution.warnings.map((warning) => warning.message) ?? []

  return {
    solvedRoofs: solved,
    shadingRoofs,
    sunProjection: {
      datetimeRaw: sunDatetimeRaw,
      dailyDateRaw: sunDailyDateRaw,
      dailyTimeZone: sunDailyTimeZone,
      hasValidDatetime: hasValidSunDatetime,
      datetimeError: sunDatetimeError,
      result: sunProjectionResult,
      onDatetimeInputChange: onSunDatetimeInputChange,
    },
    annualSimulation,
    heatmap: {
      activeMode: activeHeatmapMode,
      requestedMode: requestedHeatmapMode,
      liveCells: [],
      annualFeatures: annualSimulation.heatmapFeatures,
      mapCells: mapCellsForMap,
      mapComputeState: heatmapComputeStateForMap,
      mapEnabled: heatmapEnabledForMap,
      annualVisible: annualHeatmapVisible,
    },
    diagnostics: {
      solverError: solved.activeError,
      warnings,
      shadingResultStatus: shadingResult.resultStatus,
      shadingStatusMessage: shadingResult.statusMessage,
      shadingDiagnostics: shadingResult.diagnostics,
    },
    liveShading: {
      readyResult: shadingResult.readyResult,
      computeState: shadingResult.computeState,
      computeMode: shadingResult.computeMode,
      resultStatus: shadingResult.resultStatus,
      statusMessage: shadingResult.statusMessage,
      diagnostics: shadingResult.diagnostics,
      usedGridResolutionM: shadingResult.usedGridResolutionM,
    },
    productionComputationEnabled,
    setRequestedHeatmapMode,
    computeProcessingActive,
    solvedMetrics,
  } satisfies AnalysisState & {
    setRequestedHeatmapMode: (mode: 'live-shading' | 'annual-sun-access' | 'none') => void
    computeProcessingActive: boolean
    solvedMetrics: {
      basePitchDeg: number | null
      azimuthDeg: number | null
      roofAreaM2: number | null
      minHeightM: number | null
      maxHeightM: number | null
      fitRmsErrorM: number | null
    }
  }
}
