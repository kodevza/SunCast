import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapOverlayControls } from './MapOverlayControls'
import { useLatest } from './useLatest'
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
import type { SunCastCanvasModel } from '../../../presentation/presentationModel.types'

interface MapViewProps {
  model: SunCastCanvasModel
  onInitialized?: () => void
}

type BasemapMode = 'satellite' | 'streets'

export function MapView({ model, onInitialized }: MapViewProps) {
  const {
    editMode,
    footprints,
    activeFootprint,
    selectedFootprintIds,
    drawDraftRoof,
    isDrawingRoof,
    obstacles,
    activeObstacle,
    selectedObstacleIds,
    drawDraftObstacle,
    isDrawingObstacle,
    orbitEnabled,
    onToggleOrbit,
    sunProjectionResult,
    sunPerspectiveCameraPose,
    shadingEnabled,
    shadingHeatmapFeatures,
    shadingComputeState,
    roofMeshes,
    obstacleMeshes,
    vertexConstraints,
    selectedVertexIndex,
    selectedEdgeIndex,
    onSelectVertex,
    onSelectEdge,
    onSelectFootprint,
    onSelectObstacle,
    onClearSelection,
    onMoveVertex,
    onMoveEdge,
    onMoveObstacleVertex,
    onMoveRejected,
    onAdjustHeight,
    showSolveHint,
    onMapClick,
    onCloseDrawing,
    onObstacleMapClick,
    onCloseObstacleDrawing,
    onBearingChange,
    onPitchChange,
    onGeometryDragStateChange,
    mapNavigationTarget,
    onPlaceSearchSelect,
  } = model
  const isDrawing = editMode === 'roof' ? isDrawingRoof : isDrawingObstacle
  const drawDraft = editMode === 'roof' ? drawDraftRoof : drawDraftObstacle
  const [meshesVisible, setMeshesVisible] = useState(true)
  const [sunPerspectiveEnabled, setSunPerspectiveEnabled] = useState(false)
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('satellite')
  const [arcgisProviderAttribution, setArcgisProviderAttribution] = useState<string | null>(null)
  const [drawLengthInput, setDrawLengthInput] = useState('')
  const [constrainedDrawLengthM, setConstrainedDrawLengthM] = useState<number | null>(null)
  const effectiveDrawLengthInput = isDrawing ? drawLengthInput : ''
  const effectiveConstrainedDrawLengthM = isDrawing ? constrainedDrawLengthM : null
  const canUseSunPerspective = orbitEnabled && sunProjectionResult !== null
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

  const drawingRef = useLatest(isDrawing)
  const drawDraftRef = useLatest(drawDraft)
  const editModeRef = useLatest(editMode)
  const orbitEnabledRef = useLatest(orbitEnabled)
  const activeFootprintRef = useLatest(activeFootprint)
  const activeObstacleRef = useLatest(activeObstacle)
  const handleDrawPointCommit = useCallback(
    (point: [number, number]) => {
      if (editMode === 'obstacle') {
        onObstacleMapClick(point)
      } else {
        onMapClick(point)
      }
      setDrawLengthInput('')
      setConstrainedDrawLengthM(null)
    },
    [editMode, onMapClick, onObstacleMapClick],
  )
  const onMapClickRef = useLatest(handleDrawPointCommit)
  const onCloseDrawingRef = useLatest(() => {
    if (editMode === 'obstacle') {
      onCloseObstacleDrawing()
    } else {
      onCloseDrawing()
    }
  })
  const onSelectVertexRef = useLatest(onSelectVertex)
  const onSelectEdgeRef = useLatest(onSelectEdge)
  const onSelectFootprintRef = useLatest(onSelectFootprint)
  const onSelectObstacleRef = useLatest(onSelectObstacle)
  const onClearSelectionRef = useLatest(onClearSelection)
  const onMoveVertexRef = useLatest(onMoveVertex)
  const onMoveEdgeRef = useLatest(onMoveEdge)
  const onMoveObstacleVertexRef = useLatest(onMoveObstacleVertex)
  const onMoveRejectedRef = useLatest(onMoveRejected)
  const onBearingChangeRef = useLatest(onBearingChange)
  const onPitchChangeRef = useLatest(onPitchChange)
  const onGeometryDragStateChangeRef = useLatest(onGeometryDragStateChange)
  const interactionRefs = useMemo(
    () => ({
      drawingRef,
      drawDraftRef,
      editModeRef,
      orbitEnabledRef,
      activeFootprintRef,
      activeObstacleRef,
      onMapClickRef,
      onCloseDrawingRef,
      onSelectVertexRef,
      onSelectEdgeRef,
      onSelectFootprintRef,
      onSelectObstacleRef,
      onClearSelectionRef,
      onMoveVertexRef,
      onMoveEdgeRef,
      onMoveObstacleVertexRef,
      onMoveRejectedRef,
      onBearingChangeRef,
      onPitchChangeRef,
      onGeometryDragStateChangeRef,
    }),
    [
      activeFootprintRef,
      activeObstacleRef,
      drawDraftRef,
      drawingRef,
      editModeRef,
      onBearingChangeRef,
      onClearSelectionRef,
      onMapClickRef,
      onCloseDrawingRef,
      onMoveEdgeRef,
      onMoveObstacleVertexRef,
      onMoveRejectedRef,
      onMoveVertexRef,
      onPitchChangeRef,
      onSelectEdgeRef,
      onSelectFootprintRef,
      onSelectObstacleRef,
      onSelectVertexRef,
      orbitEnabledRef,
      onGeometryDragStateChangeRef,
    ],
  )

  const { containerRef, mapRef, mapLoaded } = useMapInstance({ onInitialized })

  const { hoveredEdgeLength, drawingAngleHint, vertexDragAngleHint, draftPreviewPoint } = useMapInteractions({
    mapRef,
    mapLoaded,
    refs: interactionRefs,
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

  useEffect(() => {
    if (!isDrawing || orbitEnabled || !drawingAngleHint) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey) {
        return
      }
      const input = document.querySelector('[data-testid="map-draw-length-input"]') as HTMLInputElement | null
      if (!input) {
        return
      }
      if (document.activeElement === input) {
        return
      }
      event.preventDefault()
      input.focus()
      input.select()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawingAngleHint, isDrawing, orbitEnabled])

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
    editMode,
    footprints,
    activeFootprint,
    selectedFootprintIds,
    obstacles,
    activeObstacle,
    selectedObstacleIds,
    drawDraftRoof,
    drawDraftObstacle,
    isDrawingRoof,
    isDrawingObstacle,
    draftPreviewPoint,
    vertexConstraints,
    selectedVertexIndex,
    selectedEdgeIndex,
  })

  const { gizmoScreenPos, adjustOrbitCamera, setOrbitCameraPose } = useOrbitCamera({
    mapRef,
    mapLoaded,
    orbitEnabled,
    footprints,
    activeFootprint,
    selectedVertexIndex,
    selectedEdgeIndex,
  })

  useMapObjects({
    mapRef,
    mapLoaded,
    roofMeshes,
    obstacleMeshes,
    heatmapFeatures: shadingHeatmapFeatures,
    orbitEnabled,
    meshesVisible,
    shadingEnabled,
    shadingComputeState,
  })

  useSunPerspectiveSync({
    enabled: effectiveSunPerspectiveEnabled,
    pose: sunPerspectiveCameraPose,
    setOrbitCameraPose,
  })

  useMapNavigationSync({
    mapRef,
    mapLoaded,
    mapNavigationTarget,
  })

  return (
    <div className="map-root-wrap">
      <div ref={containerRef} className="map-root" data-testid="map-canvas" />
      <MapOverlayControls
        basemapMode={basemapMode}
        onBasemapModeChange={setBasemapMode}
        orbitEnabled={orbitEnabled}
        onToggleOrbit={onToggleOrbit}
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
        meshCount={roofMeshes.length + obstacleMeshes.length}
        isDrawing={isDrawing}
        hasActiveFootprint={activeFootprint !== null}
        hoveredEdgeLength={hoveredEdgeLength}
        drawingAngleHint={drawingAngleHint}
        vertexDragAngleHint={vertexDragAngleHint}
        drawLengthInput={effectiveDrawLengthInput}
        onDrawLengthInputChange={setDrawLengthInput}
        onDrawLengthInputSubmit={submitDrawLengthInput}
        gizmoScreenPos={gizmoScreenPos}
        onAdjustHeight={onAdjustHeight}
        showSolveHint={showSolveHint}
        onAdjustOrbitCamera={adjustOrbitCamera}
        onPlaceSearchSelect={onPlaceSearchSelect}
      />
      <MapAttributionControl basemapMode={basemapMode} arcgisProviderAttribution={arcgisProviderAttribution} />
    </div>
  )
}
