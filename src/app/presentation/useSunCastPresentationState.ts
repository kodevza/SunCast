import { useProjectDocument } from '../project-store/useProjectDocument'
import { useEditorSession } from '../editor-session/useEditorSession'
import { useAnalysis } from '../analysis/useAnalysis'
import { useObstacleMeshResults } from '../hooks/useObstacleMeshResults'
import { useSunCastRuntimeActions } from '../hooks/useSunCastRuntimeActions'
import { useSunCastRuntimeEffects } from '../hooks/useSunCastRuntimeEffects'
import { useActiveFootprintState } from './hooks/useActiveFootprintState'
import { prepareActiveFootprintGeometry } from '../hooks/activeFootprintGeometry'
import { clampPitchAdjustmentPercent } from './presentationModel.types'

export interface SunCastPresentationState {
  projectDocument: ReturnType<typeof useProjectDocument>
  editorSession: ReturnType<typeof useEditorSession>
  analysis: ReturnType<typeof useAnalysis>
  activeFootprintErrors: string[]
  activeFootprintCentroid: [number, number] | null
  activePitchAdjustmentPercent: number
  adjustedPitchDeg: number | null
  obstacleMeshes: ReturnType<typeof useObstacleMeshResults>['obstacleMeshResults']
  selectedObstacleIds: string[]
  mapNavigationTarget: ReturnType<typeof useSunCastRuntimeActions>['mapNavigationTarget']
  onPlaceSearchSelect: ReturnType<typeof useSunCastRuntimeActions>['onPlaceSearchSelect']
  onShareProject: () => Promise<void>
}

export function useSunCastPresentationState(): SunCastPresentationState {
  const projectDocument = useProjectDocument()
  const {
    store,
    footprintEntries,
    footprints,
    activeFootprint,
    activeConstraints,
    obstacles,
    activeObstacle,
    selectedObstacles,
    selectedFootprintIds,
    sunProjection,
    shadingSettings,
  } = projectDocument

  const editorSession = useEditorSession({
    activeFootprint,
    activeConstraints,
    isDrawing: store.state.isDrawing,
    isDrawingObstacle: store.state.isDrawingObstacle,
    moveVertex: store.moveVertex,
    moveEdge: store.moveEdge,
    setVertexHeight: store.setVertexHeight,
    setVertexHeights: store.setVertexHeights,
    setEdgeHeight: store.setEdgeHeight,
  })

  const analysis = useAnalysis({
    stateRevision: projectDocument.stateRevision,
    footprintEntries,
    footprintEntriesById: store.state.footprints,
    activeFootprintId: store.state.activeFootprintId,
    selectedFootprintIds,
    activeFootprintVertices: activeFootprint?.vertices ?? null,
    obstacles,
    sunProjection,
    shadingSettings,
    hasVertexOrEdgeSelection:
      editorSession.safeSelectedVertexIndex !== null || editorSession.safeSelectedEdgeIndex !== null,
    isGeometryDragActive: editorSession.isGeometryDragActive,
    setSunProjectionDatetimeIso: store.setSunProjectionDatetimeIso,
    setSunProjectionDailyDateIso: store.setSunProjectionDailyDateIso,
  })
  const { obstacleMeshResults } = useObstacleMeshResults(obstacles)

  const { mapNavigationTarget, onPlaceSearchSelect, onShareProject } = useSunCastRuntimeActions(projectDocument)

  const activeFootprintState = prepareActiveFootprintGeometry(activeFootprint)
  const precomputedActivePitchAdjustmentPercent = activeFootprint
    ? clampPitchAdjustmentPercent(store.state.footprints[activeFootprint.id]?.pitchAdjustmentPercent ?? 0)
    : 0
  const { activeFootprintErrors, activeFootprintCentroid, activePitchAdjustmentPercent, adjustedPitchDeg } =
    useActiveFootprintState({
      ...activeFootprintState,
      activePitchAdjustmentPercent: precomputedActivePitchAdjustmentPercent,
      basePitchDeg: analysis.solvedMetrics.basePitchDeg,
    })

  useSunCastRuntimeEffects({
    projectDocument,
    editorSession,
    analysis,
    activeFootprintErrors,
    obstacleMeshResults,
    onShareProject,
  })

  return {
    projectDocument: {
      ...projectDocument,
      footprints,
      activeObstacle,
      selectedObstacles,
      activeConstraints,
    },
    editorSession,
    analysis,
    activeFootprintErrors,
    activeFootprintCentroid,
    activePitchAdjustmentPercent,
    adjustedPitchDeg,
    obstacleMeshes: obstacleMeshResults,
    selectedObstacleIds: selectedObstacles.map((obstacle) => obstacle.id),
    mapNavigationTarget,
    onPlaceSearchSelect,
    onShareProject,
  }
}
