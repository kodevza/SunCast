interface MapControllerProps {
  basemapMode: 'satellite' | 'streets'
  onBasemapModeChange: (mode: 'satellite' | 'streets') => void
  orbitEnabled: boolean
  onToggleOrbit: () => void
  sunPerspectiveEnabled: boolean
  canUseSunPerspective: boolean
  onToggleSunPerspective: () => void
  meshesVisible: boolean
  onToggleMeshesVisible: () => void
  onAdjustOrbitCamera: (bearingDeltaDeg: number, pitchDeltaDeg: number) => void
}

export function MapController({
  basemapMode,
  onBasemapModeChange,
  orbitEnabled,
  onToggleOrbit,
  sunPerspectiveEnabled,
  canUseSunPerspective,
  onToggleSunPerspective,
  meshesVisible,
  onToggleMeshesVisible,
  onAdjustOrbitCamera,
}: MapControllerProps) {
  return (
    <>
      <div className="map-basemap-controls" role="group" aria-label="Basemap mode">
        <button
          type="button"
          className={basemapMode === 'satellite' ? 'map-basemap-button map-basemap-button-active' : 'map-basemap-button'}
          onClick={() => onBasemapModeChange('satellite')}
          data-testid="basemap-satellite-button"
        >
          Satellite
        </button>
        <button
          type="button"
          className={basemapMode === 'streets' ? 'map-basemap-button map-basemap-button-active' : 'map-basemap-button'}
          onClick={() => onBasemapModeChange('streets')}
          data-testid="basemap-streets-button"
        >
          Streets
        </button>
      </div>
      <button
        type="button"
        className="map-orbit-toggle"
        onClick={onToggleOrbit}
        title="Toggle orbit editing view for 3D interaction."
        data-testid="orbit-toggle-button"
      >
        {orbitEnabled ? 'Exit orbit' : 'Orbit'}
      </button>
      <button
        type="button"
        className="map-sun-perspective-toggle"
        onClick={onToggleSunPerspective}
        title="Align camera to sun direction (requires orbit and computed sun position)."
        data-testid="sun-perspective-toggle-button"
        disabled={!orbitEnabled || !canUseSunPerspective}
      >
        {sunPerspectiveEnabled ? 'Exit sun view' : 'Sun view'}
      </button>
      <button
        type="button"
        className="map-mesh-toggle"
        onClick={onToggleMeshesVisible}
        title="Show/hide roof and obstacle meshes in orbit mode."
        data-testid="mesh-visibility-toggle-button"
        disabled={!orbitEnabled}
      >
        {meshesVisible ? 'Hide meshes' : 'Show meshes'}
      </button>
      {orbitEnabled && (
        <div className="map-camera-controls">
          <button
            type="button"
            data-testid="map-rotate-left-button"
            onClick={() => onAdjustOrbitCamera(-15, 0)}
            title="Rotate left"
          >
            ⟲
          </button>
          <button
            type="button"
            data-testid="map-rotate-right-button"
            onClick={() => onAdjustOrbitCamera(15, 0)}
            title="Rotate right"
          >
            ⟳
          </button>
          <button
            type="button"
            data-testid="map-pitch-up-button"
            onClick={() => onAdjustOrbitCamera(0, 6)}
            title="Pitch up"
          >
            ↥
          </button>
          <button
            type="button"
            data-testid="map-pitch-down-button"
            onClick={() => onAdjustOrbitCamera(0, -6)}
            title="Pitch down"
          >
            ↧
          </button>
        </div>
      )}
    </>
  )
}
