import { useMemo } from 'react'
import { useSelectionCommands } from '../../../hooks/useSelectionCommands'
import { useSunCastAppContext } from '../../../screens/SunCastAppProvider'
import type { SunCastMapViewModel } from './mapView.types'

interface UseMapViewControllerResult {
  model: SunCastMapViewModel
  onInitialized: () => void
}

export function useMapViewController(): UseMapViewControllerResult {
  const { project, session, analysis, commands, obstacleMeshResults } = useSunCastAppContext()
  const selection = useSelectionCommands()
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
        editMode: session.editMode,
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
          session.clearSelectionState()
        },
        onObstacleMapClick: project.addObstacleDraftPoint,
        onCloseObstacleDrawing: () => {
          project.commitObstacle()
          session.clearSelectionState()
        },
      },
      selection: {
        vertexConstraints: project.activeConstraints.vertexHeights,
        selectedVertexIndex: session.safeSelectedVertexIndex,
        selectedEdgeIndex: session.safeSelectedEdgeIndex,
        onSelectVertex: (vertexIndex: number) => {
          session.selectVertex(vertexIndex)
        },
        onSelectEdge: (edgeIndex: number) => {
          session.selectEdge(edgeIndex)
        },
        onSelectFootprint: selection.selectFootprint,
        onSelectObstacle: selection.selectObstacle,
        onClearSelection: selection.clearSelection,
        onMoveVertex: session.moveVertexIfValid,
        onMoveEdge: session.moveEdgeIfValid,
        onMoveObstacleVertex: project.moveObstacleVertex,
        onMoveRejected: session.setMoveRejectedError,
        onAdjustHeight: session.applyHeightStep,
      },
      view: {
        orbitEnabled: session.orbitEnabled,
        showSolveHint: !analysis.solvedRoofs.activeSolved,
        sunProjectionResult,
        sunPerspectiveCameraPose,
        mapNavigationTarget: commands.mapNavigationTarget,
        onPlaceSearchSelect: commands.onPlaceSearchSelect,
        onToggleOrbit: () => session.setOrbitEnabled((enabled) => !enabled),
        onBearingChange: session.setMapBearingDeg,
        onPitchChange: session.setMapPitchDeg,
        onGeometryDragStateChange: session.setIsGeometryDragActive,
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
  }, [analysis, commands, footprints, obstacleMeshResults, project, selection, session])

  return {
    model,
    onInitialized: () => session.setMapInitialized(true),
  }
}
