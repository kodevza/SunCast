import { useEffect, useMemo, useState } from 'react'
import type { FootprintPolygon, RoofMeshData, VertexHeightConstraint } from '../../../../types/geometry'
import type { SunProjectionResult } from '../../../../geometry/sun/sunProjection'
import { MapOverlayControls } from './MapOverlayControls'
import { useLatest } from './useLatest'
import { useMapInstance } from './useMapInstance'
import { useMapInteractions } from './useMapInteractions'
import { useMapSources } from './useMapSources'
import { useOrbitCamera } from './useOrbitCamera'

interface MapViewProps {
  footprints: FootprintPolygon[]
  activeFootprint: FootprintPolygon | null
  selectedFootprintIds: string[]
  drawDraft: Array<[number, number]>
  isDrawing: boolean
  orbitEnabled: boolean
  onToggleOrbit: () => void
  sunProjectionResult: SunProjectionResult | null
  roofMeshes: RoofMeshData[]
  vertexConstraints: VertexHeightConstraint[]
  selectedVertexIndex: number | null
  selectedEdgeIndex: number | null
  onSelectVertex: (vertexIndex: number) => void
  onSelectEdge: (edgeIndex: number) => void
  onSelectFootprint: (footprintId: string, multiSelect: boolean) => void
  onClearSelection: () => void
  onMoveVertex: (vertexIndex: number, point: [number, number]) => boolean
  onMoveEdge: (edgeIndex: number, delta: [number, number]) => boolean
  onMoveRejected: () => void
  onAdjustHeight: (stepM: number) => void
  showSolveHint: boolean
  onMapClick: (point: [number, number]) => void
  onBearingChange: (bearingDeg: number) => void
  onPitchChange: (pitchDeg: number) => void
  onGeometryDragStateChange: (dragging: boolean) => void
  onInitialized?: () => void
}

export function MapView({
  footprints,
  activeFootprint,
  selectedFootprintIds,
  drawDraft,
  isDrawing,
  orbitEnabled,
  onToggleOrbit,
  sunProjectionResult,
  roofMeshes,
  vertexConstraints,
  selectedVertexIndex,
  selectedEdgeIndex,
  onSelectVertex,
  onSelectEdge,
  onSelectFootprint,
  onClearSelection,
  onMoveVertex,
  onMoveEdge,
  onMoveRejected,
  onAdjustHeight,
  showSolveHint,
  onMapClick,
  onBearingChange,
  onPitchChange,
  onGeometryDragStateChange,
  onInitialized,
}: MapViewProps) {
  const [meshesVisible, setMeshesVisible] = useState(false)
  const [sunPerspectiveEnabled, setSunPerspectiveEnabled] = useState(false)

  const drawingRef = useLatest(isDrawing)
  const orbitEnabledRef = useLatest(orbitEnabled)
  const activeFootprintRef = useLatest(activeFootprint)
  const onMapClickRef = useLatest(onMapClick)
  const onSelectVertexRef = useLatest(onSelectVertex)
  const onSelectEdgeRef = useLatest(onSelectEdge)
  const onSelectFootprintRef = useLatest(onSelectFootprint)
  const onClearSelectionRef = useLatest(onClearSelection)
  const onMoveVertexRef = useLatest(onMoveVertex)
  const onMoveEdgeRef = useLatest(onMoveEdge)
  const onMoveRejectedRef = useLatest(onMoveRejected)
  const onBearingChangeRef = useLatest(onBearingChange)
  const onPitchChangeRef = useLatest(onPitchChange)
  const onGeometryDragStateChangeRef = useLatest(onGeometryDragStateChange)
  const interactionRefs = useMemo(
    () => ({
      drawingRef,
      orbitEnabledRef,
      activeFootprintRef,
      onMapClickRef,
      onSelectVertexRef,
      onSelectEdgeRef,
      onSelectFootprintRef,
      onClearSelectionRef,
      onMoveVertexRef,
      onMoveEdgeRef,
      onMoveRejectedRef,
      onBearingChangeRef,
      onPitchChangeRef,
      onGeometryDragStateChangeRef,
    }),
    [
      activeFootprintRef,
      drawingRef,
      onBearingChangeRef,
      onClearSelectionRef,
      onMapClickRef,
      onMoveEdgeRef,
      onMoveRejectedRef,
      onMoveVertexRef,
      onPitchChangeRef,
      onSelectEdgeRef,
      onSelectFootprintRef,
      onSelectVertexRef,
      orbitEnabledRef,
      onGeometryDragStateChangeRef,
    ],
  )

  const { containerRef, mapRef, roofLayerRef, mapLoaded } = useMapInstance({ onInitialized })

  const { hoveredEdgeLength } = useMapInteractions({
    mapRef,
    mapLoaded,
    refs: interactionRefs,
  })

  useMapSources({
    mapRef,
    mapLoaded,
    footprints,
    activeFootprint,
    selectedFootprintIds,
    drawDraft,
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

  useEffect(() => {
    roofLayerRef.current?.setMeshes(roofMeshes)
  }, [roofLayerRef, roofMeshes])

  useEffect(() => {
    roofLayerRef.current?.setVisible(orbitEnabled && meshesVisible)
  }, [meshesVisible, orbitEnabled, roofLayerRef])

  useEffect(() => {
    if (!orbitEnabled || !sunProjectionResult) {
      setSunPerspectiveEnabled(false)
    }
  }, [orbitEnabled, sunProjectionResult])

  useEffect(() => {
    if (!orbitEnabled || !sunPerspectiveEnabled || !sunProjectionResult) {
      return
    }

    const normalizedBearingDeg = ((sunProjectionResult.sunAzimuthDeg + 180 + 540) % 360) - 180
    const pitchDeg = 90 - sunProjectionResult.sunElevationDeg
    setOrbitCameraPose(normalizedBearingDeg, pitchDeg)
  }, [orbitEnabled, setOrbitCameraPose, sunPerspectiveEnabled, sunProjectionResult])

  return (
    <div className="map-root-wrap">
      <div ref={containerRef} className="map-root" data-testid="map-canvas" />
      <MapOverlayControls
        orbitEnabled={orbitEnabled}
        onToggleOrbit={onToggleOrbit}
        sunPerspectiveEnabled={sunPerspectiveEnabled}
        canUseSunPerspective={sunProjectionResult !== null}
        onToggleSunPerspective={() => setSunPerspectiveEnabled((enabled) => !enabled)}
        meshesVisible={meshesVisible}
        onToggleMeshesVisible={() => setMeshesVisible((visible) => !visible)}
        roofMeshesCount={roofMeshes.length}
        isDrawing={isDrawing}
        hasActiveFootprint={activeFootprint !== null}
        hoveredEdgeLength={hoveredEdgeLength}
        gizmoScreenPos={gizmoScreenPos}
        onAdjustHeight={onAdjustHeight}
        showSolveHint={showSolveHint}
        onAdjustOrbitCamera={adjustOrbitCamera}
      />
    </div>
  )
}
