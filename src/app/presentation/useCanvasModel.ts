import { useMemo } from 'react'
import type { SunCastCanvasModel } from './presentationModel.types'
import type { SunCastPresentationState } from './useSunCastPresentationState'

export function useCanvasModel(state: SunCastPresentationState): SunCastCanvasModel {
  const { projectDocument, editorSession, analysis } = state
  const { store } = projectDocument

  return useMemo(
    () => {
      const sunProjectionResult = analysis.sunProjection.result
      const sunPerspectiveCameraPose =
        sunProjectionResult === null
          ? null
          : {
              bearingDeg: ((sunProjectionResult.sunAzimuthDeg + 180 + 540) % 360) - 180,
              pitchDeg: 90 - sunProjectionResult.sunElevationDeg,
            }

      return {
      mapView: {
        drawing: {
          editMode: editorSession.editMode,
          footprints: projectDocument.footprints,
          activeFootprint: projectDocument.activeFootprint,
          selectedFootprintIds: projectDocument.selectedFootprintIds,
          drawDraftRoof: store.state.drawDraft,
          isDrawingRoof: store.state.isDrawing,
          obstacles: projectDocument.obstacles,
          activeObstacle: projectDocument.activeObstacle,
          selectedObstacleIds: state.selectedObstacleIds,
          drawDraftObstacle: store.state.obstacleDrawDraft,
          isDrawingObstacle: store.state.isDrawingObstacle,
          onMapClick: store.addDraftPoint,
          onCloseDrawing: () => {
            store.commitFootprint()
            editorSession.clearSelectionState()
          },
          onObstacleMapClick: store.addObstacleDraftPoint,
          onCloseObstacleDrawing: () => {
            store.commitObstacle()
            editorSession.clearSelectionState()
          },
        },
        selection: {
          vertexConstraints: projectDocument.activeConstraints.vertexHeights,
          selectedVertexIndex: editorSession.safeSelectedVertexIndex,
          selectedEdgeIndex: editorSession.safeSelectedEdgeIndex,
          onSelectVertex: (vertexIndex) => {
            editorSession.selectVertex(vertexIndex)
          },
          onSelectEdge: (edgeIndex) => {
            editorSession.selectEdge(edgeIndex)
          },
          onSelectFootprint: (footprintId, multiSelect) => {
            if (multiSelect) {
              store.toggleFootprintSelection(footprintId)
            } else {
              store.selectOnlyFootprint(footprintId)
            }
            editorSession.clearSelectionState()
          },
          onSelectObstacle: (obstacleId, multiSelect) => {
            if (multiSelect) {
              store.toggleObstacleSelection(obstacleId)
            } else {
              store.selectOnlyObstacle(obstacleId)
            }
            editorSession.clearSelectionState()
          },
          onClearSelection: () => {
            editorSession.clearSelectionState()
            store.clearFootprintSelection()
            store.clearObstacleSelection()
          },
          onMoveVertex: editorSession.moveVertexIfValid,
          onMoveEdge: editorSession.moveEdgeIfValid,
          onMoveObstacleVertex: store.moveObstacleVertex,
          onMoveRejected: editorSession.setMoveRejectedError,
          onAdjustHeight: editorSession.applyHeightStep,
        },
        view: {
          orbitEnabled: editorSession.orbitEnabled,
          showSolveHint: !analysis.solvedRoofs.activeSolved,
          sunProjectionResult,
          sunPerspectiveCameraPose,
          mapNavigationTarget: state.mapNavigationTarget,
          onPlaceSearchSelect: state.onPlaceSearchSelect,
          onToggleOrbit: () => editorSession.setOrbitEnabled((enabled) => !enabled),
          onBearingChange: editorSession.setMapBearingDeg,
          onPitchChange: editorSession.setMapPitchDeg,
          onGeometryDragStateChange: editorSession.setIsGeometryDragActive,
        },
        render: {
          shadingEnabled: analysis.heatmap.mapEnabled,
          shadingHeatmapFeatures: analysis.heatmap.mapFeatures,
          shadingComputeState: analysis.heatmap.mapComputeState,
          roofMeshes: analysis.solvedRoofs.entries.map((entry) => entry.mesh),
          obstacleMeshes: state.obstacleMeshes
            .filter((result): result is Extract<typeof result, { ok: true }> => result.ok)
            .map((result) => result.value),
        },
      },
      sunProjectionEnabled: projectDocument.sunProjection.enabled,
      hasValidSunDatetime: analysis.sunProjection.hasValidDatetime,
      sunDatetimeError: analysis.sunProjection.datetimeError,
      annualSimulationHeatmapFeatures: analysis.heatmap.annualFeatures,
      annualSimulationState: analysis.annualSimulation.state,
      activeHeatmapMode: analysis.heatmap.activeMode,
      shadingComputeMode: analysis.liveShading.computeMode,
      shadingResultStatus: analysis.liveShading.resultStatus,
      shadingStatusMessage: analysis.liveShading.statusMessage,
      shadingDiagnostics: analysis.liveShading.diagnostics,
      shadingGridResolutionM: projectDocument.shadingSettings.gridResolutionM,
      shadingUsedGridResolutionM: analysis.liveShading.usedGridResolutionM,
      sunDatetimeRaw: analysis.sunProjection.datetimeRaw,
      sunDailyDateRaw: analysis.sunProjection.dailyDateRaw,
      sunDailyTimeZone: analysis.sunProjection.dailyTimeZone,
      selectedRoofInputs: analysis.selectedRoofInputs,
      hasSolvedActiveRoof: Boolean(analysis.solvedRoofs.activeSolved),
      productionComputationEnabled: analysis.productionComputationEnabled,
      onInitialized: () => editorSession.setMapInitialized(true),
      onToggleSunProjectionEnabled: store.setSunProjectionEnabled,
      onSunDatetimeInputChange: (datetimeIsoRaw) => {
        editorSession.setTutorialDatetimeEdited(true)
        analysis.sunProjection.onDatetimeInputChange(datetimeIsoRaw)
      },
      annualSunAccess: {
        selectedRoofCount: analysis.shadingRoofs.length,
        gridResolutionM: projectDocument.shadingSettings.gridResolutionM,
        state: analysis.annualSimulation.state,
        progressRatio: analysis.annualSimulation.progress.ratio,
        result: analysis.annualSimulation.result,
        error: analysis.annualSimulation.error,
        isAnnualHeatmapVisible: analysis.heatmap.annualVisible,
        onGridResolutionChange: (gridResolutionM: number) => {
          store.setShadingGridResolutionM(gridResolutionM)
        },
        onRunSimulation: analysis.annualSimulation.runSimulation,
        onClearSimulation: () => {
          analysis.annualSimulation.clearSimulation()
          analysis.setRequestedHeatmapMode(projectDocument.shadingSettings.enabled ? 'live-shading' : 'none')
        },
        onShowAnnualHeatmap: () => {
          if (analysis.annualSimulation.state !== 'READY' || analysis.annualSimulation.heatmapFeatures.length === 0) {
            return
          }
          analysis.setRequestedHeatmapMode('annual-sun-access')
        },
        onHideAnnualHeatmap: () => {
          analysis.setRequestedHeatmapMode(projectDocument.shadingSettings.enabled ? 'live-shading' : 'none')
        },
      },
    }
    },
    [analysis, editorSession, projectDocument, state, store],
  )
}
