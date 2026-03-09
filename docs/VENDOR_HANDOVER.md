# Vendor Handover

## Scope Delivered

Stage 1 editor is production-like for single-plane roof modeling from map footprints with deterministic regeneration from persisted constraints.

## Acceptance Criteria

1. User can draw at least one polygon footprint.
2. User can set vertex/edge height constraints.
3. Solver computes planar roof pitch and azimuth.
4. Roof mesh renders in orbit mode.
5. Project can be reloaded with identical solved geometry and metrics.

## Operational Notes

- Geometry source data lives in project store (`footprints + constraints`).
- Meshes are generated from solved planes; do not persist meshes as source.
- Degraded mode behavior:
  - runtime crash -> `AppErrorBoundary` fallback panel
  - map startup error -> map overlay fallback message
  - search/forecast failures -> feature-level non-fatal status

## Code Hotspots

- `src/app/hooks/useSunCastController.ts`: top-level orchestration; split into sub-hooks already started.
- `src/app/features/map-editor/MapView/useMapInteractions.ts`: interaction coordinator; handlers extracted into dedicated module.
- `src/state/project-store/projectState.reducer.ts`: central state transitions.

## CI / Delivery

- CI gate: `.github/workflows/ci.yml`
- Repository validation: `.github/workflows/validation.yml`
- Deploy: `.github/workflows/deploy-pages.yml` (after CI success)

## Known Risks

- External API uptime (Photon, Open-Meteo, map tiles).
- Browser API differences for share/clipboard/compression.
- Large project solve performance without per-footprint cache.

## Post-Handover Priority Backlog

1. Add solve-result caching keyed by footprint/constraint fingerprint.
2. Add retry + cache strategy for search/forecast providers.
3. Add observability hooks (runtime errors, provider failures, performance timings).
4. Harden share/import payload size and schema migration rules.
