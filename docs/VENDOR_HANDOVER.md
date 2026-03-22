# Vendor Handover

## Scope Delivered

Stage 1 editor is production-like for deterministic single-plane roof modeling and shading workflows, with map-editor boundaries now split into:
- `DrawTools` (draw workflow + shortcuts)
- `MapView` (map runtime + interactions + basemap controls)
- `MapObjects` (roof/obstacle/roof-projected binary shaded-cell sync)

## Acceptance Criteria

1. User can draw one or many roof footprints.
2. User can set vertex/edge height constraints.
3. Solver computes planar roof pitch and azimuth.
4. Roof/obstacle meshes render in orbit mode.
5. Basemap can switch between satellite and streets without losing editor state.
6. Attribution is visible for active basemap (OSM fixed wording; Esri plus provider metadata when available).
7. Project can be reloaded with identical solved geometry and metrics.
8. Annual shading simulation runs and produces roof shading summary metrics.

## Operational Notes

- Geometry source data lives in project store (`footprints + constraints + obstacles + shading settings`).
- Meshes and shading overlays are derived artifacts; never persist them as canonical state.
- Transport-level HTTP calls are isolated to `src/app/clients/*`.
- Degraded mode behavior:
  - runtime crash -> `AppErrorBoundary` fallback panel
  - map startup error -> map overlay fallback message
  - search/forecast failures -> feature-level non-fatal status
  - ArcGIS attribution metadata failure -> keep map usable, show `Powered by Esri`

## Code Hotspots

- `src/app/project-store/useProjectStore.ts`: runtime store composition, hydration, and canonical persistence wiring.
- `src/app/screens/SunCastSidebar.tsx`: sidebar composition and tutorial trigger wiring.
- `src/app/features/map-editor/DrawTools/hooks/useDrawToolsController.ts`: draw-tool controller used by the sidebar.
- `src/app/features/sidebar/useFootprintPanelController.ts`: roof-polygon panel controller.
- `src/app/features/sidebar/useFootprintCommands.ts`: active footprint command helpers.
- `src/app/features/sidebar/useConstraintCommands.ts`: active constraint command helpers.
- `src/app/features/sidebar/useObstacleCommands.ts`: active obstacle command helpers.
- `src/app/features/sidebar/useActiveFootprintMetrics.ts`: active footprint metric shaping for the status panel.
- `src/app/features/sidebar/useActiveFootprintState.ts`: derived active-footprint state helper.
- `src/app/features/sidebar/useRoofEditorController.ts`: constraint editor controller.
- `src/app/features/sidebar/useObstaclePanelController.ts`: obstacle panel controller.
- `src/app/features/sidebar/useStatusPanelController.ts`: roof status / pitch-adjustment controller.
- `src/app/editor-session/editorSession.reducer.ts`: session reducer composition for drawing and selection state.
- `src/app/editor-session/roofDrawing.reducer.ts`: roof drawing session reducer.
- `src/app/editor-session/obstacleDrawing.reducer.ts`: obstacle drawing session reducer.
- `src/app/editor-session/obstacleSelection.reducer.ts`: obstacle selection session reducer.
- `src/app/screens/SunCastScreen.tsx`: final screen composition and runtime effect mounting.
- `src/app/screens/SunCastCanvas.tsx`: top-level canvas wiring for map and sun-tool controllers.
- `src/app/features/map-editor/MapView/useMapViewController.ts`: map runtime composition.
- `src/app/features/place-search/useMapNavigationRuntime.ts`: map navigation target state for place-search selection.
- `src/app/features/share-project/useShareProjectAction.ts`: share URL assembly and browser fallback behavior.
- `src/app/features/sun-tools/useSunToolsController.ts`: sun projection / annual simulation controller.
- `src/app/features/sun-tools/useAnnualSunAccessController.ts`: annual sun-access controller extracted from the sun-tools flow.
- `src/app/features/sun-tools/useSelectedRoofInputs.ts`: feature-owned shaping for sun chart/forecast roof inputs.
- `src/app/features/map-editor/MapView/hooks/useMapInteractions.ts`: interaction coordinator.
- `src/app/features/map-editor/MapView/useMapViewRuntime.ts`: shared map-view runtime state for orbit and map lifecycle.
- `src/app/features/map-editor/MapObjects/hooks/useMapObjectsSync.ts`: custom-layer lifecycle and visibility sync.
- `src/app/features/map-editor/MapObjects/layers/ProjectedBinaryShadeLayer.ts`: projected binary shaded-cell custom layer.
- `src/geometry/shading/*`: deterministic sun/shade business logic and annual aggregation.
- `src/state/project-store/projectState.reducer.ts`: canonical project-document transitions.

## CI / Delivery

- CI gate: `.github/workflows/ci.yml`
- Repository validation: `.github/workflows/validation.yml`
- Deploy: `.github/workflows/deploy-pages.yml` (after CI success)

## Known Risks

- External API uptime (Photon, Open-Meteo, ArcGIS metadata endpoint, map tiles).
- Browser API differences for share/clipboard/compression.
- Large project solve/simulation performance without per-footprint caching.

## Post-Handover Priority Backlog

1. Add solve-result caching keyed by footprint/constraint fingerprint.
2. Add provider fallback strategy and stronger circuit-breaker policy.
3. Expand observability for shading compute and map-object rendering cost.
4. Harden share/import payload size and schema migration rules.
