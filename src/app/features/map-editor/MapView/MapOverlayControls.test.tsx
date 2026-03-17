// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { MapOverlayControls } from './MapOverlayControls'

vi.mock('../../place-search/PlaceSearchPanel', () => ({
  PlaceSearchPanel: () => <div data-testid="place-search-panel" />,
}))

vi.mock('./MapController', () => ({
  MapController: () => <div data-testid="map-controller" />,
}))

vi.mock('./MapDrawingController', () => ({
  MapDrawingController: () => <div data-testid="map-drawing-controller" />,
}))

describe('MapOverlayControls', () => {
  it('does not render the height gizmo in orbit mode', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <MapOverlayControls
          basemapMode="satellite"
          onBasemapModeChange={vi.fn()}
          orbitEnabled
          onToggleOrbit={vi.fn()}
          sunPerspectiveEnabled={false}
          canUseSunPerspective={false}
          onToggleSunPerspective={vi.fn()}
          meshesVisible={false}
          onToggleMeshesVisible={vi.fn()}
          meshCount={0}
          isDrawing={false}
          hasActiveFootprint
          hoveredEdgeLength={null}
          drawingAngleHint={null}
          vertexDragAngleHint={null}
          drawLengthInput=""
          onDrawLengthInputChange={vi.fn()}
          onDrawLengthInputSubmit={vi.fn()}
          showSolveHint={false}
          onAdjustOrbitCamera={vi.fn()}
          onPlaceSearchSelect={vi.fn()}
        />,
      )
    })

    expect(container.querySelector('.height-gizmo')).toBeNull()
    expect(container.textContent).not.toContain('▲')
    expect(container.textContent).not.toContain('▼')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
