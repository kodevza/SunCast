# Vendor Handover

## Scope Delivered

Stage 1 editor is production-like for deterministic single-plane roof modeling and shading workflows, with map-editor boundaries now split into:
- `DrawTools` (draw workflow + shortcuts)
- `MapView` (map runtime + interactions + basemap controls)
- `MapObjects` (roof/obstacle/heatmap custom layer sync)

## Acceptance Criteria

1. User can draw one or many roof footprints.
2. User can set vertex/edge height constraints.
3. Solver computes planar roof pitch and azimuth.
4. Roof/obstacle meshes render in orbit mode.
5. Basemap can switch between satellite and streets without losing editor state.
6. Attribution is visible for active basemap (OSM fixed wording; Esri plus provider metadata when available).
7. Project can be reloaded with identical solved geometry and metrics.
8. Annual shading simulation runs and produces roof heatmap + summary metrics.

## Operational Notes

- Geometry source data lives in project store (`footprints + constraints + obstacles + shading settings`).
- Meshes and heatmaps are derived artifacts; never persist them as canonical state.
- Transport-level HTTP calls are isolated to `src/app/clients/*`.
- Degraded mode behavior:
  - runtime crash -> `AppErrorBoundary` fallback panel
  - map startup error -> map overlay fallback message
  - search/forecast failures -> feature-level non-fatal status
  - ArcGIS attribution metadata failure -> keep map usable, show `Powered by Esri`

## Code Hotspots

- `src/app/presentation/useSunCastPresentationState.ts`: composition and action/event bridge.
- `src/app/features/map-editor/MapView/hooks/useMapInteractions.ts`: interaction coordinator.
- `src/app/features/map-editor/MapObjects/hooks/useMapObjectsSync.ts`: custom-layer lifecycle and visibility sync.
- `src/geometry/shading/*`: deterministic sun/shade business logic and annual aggregation.
- `src/state/project-store/projectState.reducer.ts`: central state transitions.

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
