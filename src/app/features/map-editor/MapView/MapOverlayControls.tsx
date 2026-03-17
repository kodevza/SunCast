import type { DrawingAngleHint, HoveredEdgeLength, VertexDragAngleHint } from './hooks/useMapInteractions'
import { PlaceSearchPanel } from '../../place-search/PlaceSearchPanel'
import type { PlaceSearchResult } from '../../place-search/placeSearch.types'
import { MapController } from './MapController'
import { MapDrawingController } from './MapDrawingController'

interface MapOverlayControlsProps {
  basemapMode: 'satellite' | 'streets'
  onBasemapModeChange: (mode: 'satellite' | 'streets') => void
  orbitEnabled: boolean
  onToggleOrbit: () => void
  sunPerspectiveEnabled: boolean
  canUseSunPerspective: boolean
  onToggleSunPerspective: () => void
  meshesVisible: boolean
  onToggleMeshesVisible: () => void
  meshCount: number
  isDrawing: boolean
  hasActiveFootprint: boolean
  hoveredEdgeLength: HoveredEdgeLength | null
  drawingAngleHint: DrawingAngleHint | null
  vertexDragAngleHint: VertexDragAngleHint | null
  drawLengthInput: string
  onDrawLengthInputChange: (value: string) => void
  onDrawLengthInputSubmit: () => void
  showSolveHint: boolean
  onAdjustOrbitCamera: (bearingDeltaDeg: number, pitchDeltaDeg: number) => void
  onPlaceSearchSelect: (result: PlaceSearchResult) => void
}

export function MapOverlayControls({
  basemapMode,
  onBasemapModeChange,
  orbitEnabled,
  onToggleOrbit,
  sunPerspectiveEnabled,
  canUseSunPerspective,
  onToggleSunPerspective,
  meshesVisible,
  onToggleMeshesVisible,
  meshCount,
  isDrawing,
  hasActiveFootprint,
  hoveredEdgeLength,
  drawingAngleHint,
  vertexDragAngleHint,
  drawLengthInput,
  onDrawLengthInputChange,
  onDrawLengthInputSubmit,
  showSolveHint,
  onAdjustOrbitCamera,
  onPlaceSearchSelect,
}: MapOverlayControlsProps) {
  return (
    <>
      <div className="map-place-search">
        <PlaceSearchPanel onSelectResult={onPlaceSearchSelect} />
      </div>
      <MapController
        basemapMode={basemapMode}
        onBasemapModeChange={onBasemapModeChange}
        orbitEnabled={orbitEnabled}
        onToggleOrbit={onToggleOrbit}
        sunPerspectiveEnabled={sunPerspectiveEnabled}
        canUseSunPerspective={canUseSunPerspective}
        onToggleSunPerspective={onToggleSunPerspective}
        meshesVisible={meshesVisible}
        onToggleMeshesVisible={onToggleMeshesVisible}
        onAdjustOrbitCamera={onAdjustOrbitCamera}
      />
      {orbitEnabled && meshCount === 0 && !isDrawing && (
        <div className="map-mesh-hint" data-testid="map-mesh-hint">
          Meshes need a solved roof or at least one obstacle.
        </div>
      )}
      {hoveredEdgeLength && !isDrawing && !orbitEnabled && (
        <div
          className="map-edge-hover-label"
          style={{ left: `${hoveredEdgeLength.left}px`, top: `${hoveredEdgeLength.top}px` }}
          data-testid="map-edge-hover-label"
        >
          {hoveredEdgeLength.lengthM.toFixed(2)} m
        </div>
      )}
      {drawingAngleHint && isDrawing && !orbitEnabled && (
        <MapDrawingController
          drawingAngleHint={drawingAngleHint}
          drawLengthInput={drawLengthInput}
          onDrawLengthInputChange={onDrawLengthInputChange}
          onDrawLengthInputSubmit={onDrawLengthInputSubmit}
          enabled={isDrawing && !orbitEnabled}
        />
      )}
      {vertexDragAngleHint && !isDrawing && !orbitEnabled && (
        <div
          className="map-edge-hover-label"
          style={{ left: `${vertexDragAngleHint.left}px`, top: `${vertexDragAngleHint.top}px` }}
          data-testid="map-vertex-angle-label"
        >
          {vertexDragAngleHint.angleDeg.toFixed(1)} deg
        </div>
      )}
      {orbitEnabled && showSolveHint && hasActiveFootprint && <div className="map-hint">Add heights to solve plane</div>}
    </>
  )
}
