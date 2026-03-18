import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapOverlayControls } from './MapOverlayControls'
import { useMapInstance } from './hooks/useMapInstance'
import { useMapInteractions } from './hooks/useMapInteractions'
import { useMapSources } from './hooks/useMapSources'
import { useOrbitCamera } from './hooks/useOrbitCamera'
import { pointAtDistanceMeters } from './drawingAssist'
import { useMapObjects } from '../MapObjects/MapObjects'
import { useMapNavigationSync } from './hooks/useMapNavigationSync'
import { useSunPerspectiveSync } from './hooks/useSunPerspectiveSync'
import { SATELLITE_LAYER_ID, STREETS_LAYER_ID } from './mapViewConstants'
import { MapAttributionControl } from './MapAttributionControl'
import { fetchArcgisProviderAttribution } from './arcgisAttribution'
import type { SunCastMapViewModel } from './mapView.types'

interface MapViewProps {
  model: SunCastMapViewModel
  onInitialized?: () => void
}

type BasemapMode = 'satellite' | 'streets'

export function MapView({ model, onInitialized }: MapViewProps) {
  const { drawing, selection, view, render } = model
  const isDrawing = drawing.editMode === 'roof' ? drawing.isDrawingRoof : drawing.isDrawingObstacle
  const drawDraft = drawing.editMode === 'roof' ? drawing.drawDraftRoof : drawing.drawDraftObstacle
  const [meshesVisible, setMeshesVisible] = useState(true)
  const [sunPerspectiveEnabled, setSunPerspectiveEnabled] = useState(false)
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('satellite')
  const [arcgisProviderAttribution, setArcgisProviderAttribution] = useState<string | null>(null)
  const [drawLengthInput, setDrawLengthInput] = useState('')
  const [constrainedDrawLengthM, setConstrainedDrawLengthM] = useState<number | null>(null)
  const effectiveDrawLengthInput = isDrawing ? drawLengthInput : ''
  const effectiveConstrainedDrawLengthM = isDrawing ? constrainedDrawLengthM : null
  const canUseSunPerspective = view.orbitEnabled && view.sunProjectionResult !== null
  const effectiveSunPerspectiveEnabled = canUseSunPerspective && sunPerspectiveEnabled

  const parseDrawLengthInput = useCallback(() => {
    const trimmed = drawLengthInput.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [drawLengthInput])

  const commitDrawLengthInput = useCallback(() => {
    const parsed = parseDrawLengthInput()
    setConstrainedDrawLengthM(parsed)
    return parsed
  }, [parseDrawLengthInput])

  const handleDrawPointCommit = useCallback(
    (point: [number, number]) => {
      if (drawing.editMode === 'obstacle') {
        drawing.onObstacleMapClick(point)
      } else {
        drawing.onMapClick(point)
      }
      setDrawLengthInput('')
      setConstrainedDrawLengthM(null)
    },
    [drawing],
  )
  const handleCloseDrawing = useCallback(() => {
    if (drawing.editMode === 'obstacle') {
      drawing.onCloseObstacleDrawing()
    } else {
      drawing.onCloseDrawing()
    }
  }, [drawing])
  const interactionModel = useMemo(
    () => ({
      drawing: {
        editMode: drawing.editMode,
        drawDraft,
        isDrawing,
        activeFootprint: drawing.activeFootprint,
        activeObstacle: drawing.activeObstacle,
        commitDrawPoint: handleDrawPointCommit,
        closeDrawing: handleCloseDrawing,
      },
      selection: {
        onSelectVertex: selection.onSelectVertex,
        onSelectEdge: selection.onSelectEdge,
        onSelectFootprint: selection.onSelectFootprint,
        onSelectObstacle: selection.onSelectObstacle,
        onClearSelection: selection.onClearSelection,
        onMoveVertex: selection.onMoveVertex,
        onMoveEdge: selection.onMoveEdge,
        onMoveObstacleVertex: selection.onMoveObstacleVertex,
        onMoveRejected: selection.onMoveRejected,
      },
      camera: {
        orbitEnabled: view.orbitEnabled,
        onBearingChange: view.onBearingChange,
        onPitchChange: view.onPitchChange,
        onGeometryDragStateChange: view.onGeometryDragStateChange,
      },
    }),
    [
      drawing.activeFootprint,
      drawing.activeObstacle,
      drawing.editMode,
      drawDraft,
      handleCloseDrawing,
      handleDrawPointCommit,
      isDrawing,
      selection,
      view,
    ],
  )

  const { containerRef, mapRef, mapLoaded } = useMapInstance({ onInitialized })

  const { hoveredEdgeLength, drawingAngleHint, vertexDragAngleHint, draftPreviewPoint } = useMapInteractions({
    mapRef,
    mapLoaded,
    model: interactionModel,
    constrainedDrawLengthM: effectiveConstrainedDrawLengthM,
  })

  useEffect(() => {
    const abortController = new AbortController()
    void fetchArcgisProviderAttribution(abortController.signal)
      .then((providerAttribution) => {
        setArcgisProviderAttribution(providerAttribution)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      })
    return () => abortController.abort()
  }, [])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) {
      return
    }

    const satelliteVisibility = basemapMode === 'satellite' ? 'visible' : 'none'
    const streetsVisibility = basemapMode === 'streets' ? 'visible' : 'none'

    if (mapRef.current.getLayer(SATELLITE_LAYER_ID)) {
      mapRef.current.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', satelliteVisibility)
    }
    if (mapRef.current.getLayer(STREETS_LAYER_ID)) {
      mapRef.current.setLayoutProperty(STREETS_LAYER_ID, 'visibility', streetsVisibility)
    }
  }, [basemapMode, mapLoaded, mapRef])

  const submitDrawLengthInput = useCallback(() => {
    if (!isDrawing || !draftPreviewPoint || drawDraft.length < 1) {
      return
    }
    const parsed = commitDrawLengthInput()
    const anchor = drawDraft[drawDraft.length - 1]
    const point = parsed !== null ? pointAtDistanceMeters(anchor, draftPreviewPoint, parsed) : draftPreviewPoint
    handleDrawPointCommit(point)
  }, [commitDrawLengthInput, draftPreviewPoint, drawDraft, handleDrawPointCommit, isDrawing])

  useMapSources({
    mapRef,
    mapLoaded,
    editMode: drawing.editMode,
    footprints: drawing.footprints,
    activeFootprint: drawing.activeFootprint,
    selectedFootprintIds: drawing.selectedFootprintIds,
    obstacles: drawing.obstacles,
    activeObstacle: drawing.activeObstacle,
    selectedObstacleIds: drawing.selectedObstacleIds,
    drawDraftRoof: drawing.drawDraftRoof,
    drawDraftObstacle: drawing.drawDraftObstacle,
    isDrawingRoof: drawing.isDrawingRoof,
    isDrawingObstacle: drawing.isDrawingObstacle,
    draftPreviewPoint,
    vertexConstraints: selection.vertexConstraints,
    selectedVertexIndex: selection.selectedVertexIndex,
    selectedEdgeIndex: selection.selectedEdgeIndex,
  })

  const { adjustOrbitCamera, setOrbitCameraPose } = useOrbitCamera({
    mapRef,
    mapLoaded,
    orbitEnabled: view.orbitEnabled,
    footprints: drawing.footprints,
    activeFootprint: drawing.activeFootprint,
    selectedVertexIndex: selection.selectedVertexIndex,
    selectedEdgeIndex: selection.selectedEdgeIndex,
  })

  useMapObjects({
    mapRef,
    mapLoaded,
    roofMeshes: render.roofMeshes,
    obstacleMeshes: render.obstacleMeshes,
    heatmapFeatures: render.shadingHeatmapFeatures,
    orbitEnabled: view.orbitEnabled,
    meshesVisible,
    shadingEnabled: render.shadingEnabled,
    shadingComputeState: render.shadingComputeState,
  })

  useSunPerspectiveSync({
    enabled: effectiveSunPerspectiveEnabled,
    pose: view.sunPerspectiveCameraPose,
    setOrbitCameraPose,
  })

  useMapNavigationSync({
    mapRef,
    mapLoaded,
    mapNavigationTarget: view.mapNavigationTarget,
  })

  return (
    <div className="map-root-wrap">
      <div ref={containerRef} className="map-root" data-testid="map-canvas" />
      <MapOverlayControls
        basemapMode={basemapMode}
        onBasemapModeChange={setBasemapMode}
        orbitEnabled={view.orbitEnabled}
        onToggleOrbit={view.onToggleOrbit}
        sunPerspectiveEnabled={effectiveSunPerspectiveEnabled}
        canUseSunPerspective={canUseSunPerspective}
        onToggleSunPerspective={() => {
          if (!canUseSunPerspective) {
            return
          }
          setSunPerspectiveEnabled((enabled) => !enabled)
        }}
        meshesVisible={meshesVisible}
        onToggleMeshesVisible={() => setMeshesVisible((visible) => !visible)}
        meshCount={render.roofMeshes.length + render.obstacleMeshes.length}
        isDrawing={isDrawing}
        hasActiveFootprint={drawing.activeFootprint !== null}
        hoveredEdgeLength={hoveredEdgeLength}
        drawingAngleHint={drawingAngleHint}
        vertexDragAngleHint={vertexDragAngleHint}
        drawLengthInput={effectiveDrawLengthInput}
        onDrawLengthInputChange={setDrawLengthInput}
        onDrawLengthInputSubmit={submitDrawLengthInput}
        showSolveHint={view.showSolveHint}
        onAdjustOrbitCamera={adjustOrbitCamera}
        onPlaceSearchSelect={view.onPlaceSearchSelect}
      />
      <MapAttributionControl basemapMode={basemapMode} arcgisProviderAttribution={arcgisProviderAttribution} />
    </div>
  )
}
