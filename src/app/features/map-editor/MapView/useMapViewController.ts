import { useMemo } from 'react'
import { useMapNavigationRuntime } from '../../place-search/useMapNavigationRuntime'
import { useSelectionCommands } from '../../sidebar/useSelectionCommands'
import type { ReturnTypeUseAnalysis } from '../../../hooks/hookReturnTypes'
import type { EditModeState, GeometryEditingState, GeometrySelectionState } from '../../../editor-session/editorSession.types'
import type { useMapViewRuntime } from './useMapViewRuntime'
import type { useObstacleMeshResults } from '../../../hooks/useObstacleMeshResults'
import type { useProjectStore } from '../../../project-store/useProjectStore'
import type { SunCastMapViewModel } from './mapView.types'

interface UseMapViewControllerResult {
  model: SunCastMapViewModel
  onInitialized: () => void
}

interface UseMapViewControllerArgs {
  project: ReturnType<typeof useProjectStore>
  mapView: ReturnType<typeof useMapViewRuntime>
  analysis: ReturnTypeUseAnalysis
  obstacleMeshResults: ReturnType<typeof useObstacleMeshResults>['obstacleMeshResults']
  editMode: EditModeState
  geometrySelection: GeometrySelectionState
  geometryEditing: GeometryEditingState
}

export function useMapViewController({
  project,
  mapView,
  analysis,
  obstacleMeshResults,
  editMode,
  geometrySelection,
  geometryEditing,
}: UseMapViewControllerArgs): UseMapViewControllerResult {
  const selection = useSelectionCommands({ project, geometrySelection })
  const mapNavigation = useMapNavigationRuntime()
  const footprints = useMemo(
    () => Object.values(project.state.footprints).map((entry) => entry.footprint),
    [project.state.footprints],
  )

  const model = useMemo(() => {
    const sunProjectionResult = analysis.sunProjection.result
    const sunPerspectiveCameraPose =
      sunProjectionResult === null
        ? null
        : {
            bearingDeg: ((sunProjectionResult.sunAzimuthDeg + 180 + 540) % 360) - 180,
            pitchDeg: 90 - sunProjectionResult.sunElevationDeg,
          }

    return {
      drawing: {
        editMode: editMode.editMode,
        footprints,
        activeFootprint: project.activeFootprint,
        selectedFootprintIds: project.selectedFootprintIds,
        drawDraftRoof: project.state.drawDraft,
        isDrawingRoof: project.state.isDrawing,
        obstacles: project.obstacles,
        activeObstacle: project.activeObstacle,
        selectedObstacleIds: project.state.selectedObstacleIds,
        drawDraftObstacle: project.state.obstacleDrawDraft,
        isDrawingObstacle: project.state.isDrawingObstacle,
        onMapClick: project.addDraftPoint,
        onCloseDrawing: () => {
          project.commitFootprint()
          geometrySelection.clearSelectionState()
        },
        onObstacleMapClick: project.addObstacleDraftPoint,
        onCloseObstacleDrawing: () => {
          project.commitObstacle()
          geometrySelection.clearSelectionState()
        },
      },
      selection: {
        vertexConstraints: project.activeConstraints.vertexHeights,
        selectedVertexIndex: geometrySelection.safeSelectedVertexIndex,
        selectedEdgeIndex: geometrySelection.safeSelectedEdgeIndex,
        onSelectVertex: geometrySelection.selectVertex,
        onSelectEdge: geometrySelection.selectEdge,
        onSelectFootprint: selection.selectFootprint,
        onSelectObstacle: selection.selectObstacle,
        onClearSelection: selection.clearSelection,
        onMoveVertex: geometryEditing.moveVertexIfValid,
        onMoveEdge: geometryEditing.moveEdgeIfValid,
        onMoveObstacleVertex: project.moveObstacleVertex,
        onMoveRejected: geometryEditing.setMoveRejectedError,
        onAdjustHeight: geometryEditing.applyHeightStep,
      },
      view: {
        orbitEnabled: mapView.orbitEnabled,
        showSolveHint: !analysis.solvedRoofs.activeSolved,
        sunProjectionResult,
        sunPerspectiveCameraPose,
        mapNavigation,
        onToggleOrbit: () => mapView.setOrbitEnabled((enabled) => !enabled),
        onBearingChange: mapView.setMapBearingDeg,
        onPitchChange: mapView.setMapPitchDeg,
        onGeometryDragStateChange: geometryEditing.setIsGeometryDragActive,
      },
      render: {
        shadingEnabled: analysis.heatmap.mapEnabled,
        shadingHeatmapFeatures: analysis.heatmap.mapFeatures,
        shadingComputeState: analysis.heatmap.mapComputeState,
        roofMeshes: analysis.solvedRoofs.entries.map((entry) => entry.mesh),
        obstacleMeshes: obstacleMeshResults
          .filter((result): result is Extract<typeof result, { ok: true }> => result.ok)
          .map((result) => result.value),
      },
    } satisfies SunCastMapViewModel
  }, [
    analysis,
    editMode.editMode,
    footprints,
    geometryEditing,
    geometrySelection,
    mapNavigation,
    mapView,
    obstacleMeshResults,
    project,
    selection,
  ])

  return {
    model,
    onInitialized: () => mapView.setMapInitialized(true),
  }
}
