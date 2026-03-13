# SunCast Architecture

## Source Of Truth

The system is geometry-first.

```text
footprint polygon + height constraints + obstacle inputs + shading settings
-> solved planes + shade metrics
-> generated meshes + overlays
```

Canonical persisted inputs:
- footprints
- height constraints
- obstacle definitions (shape/kind/height)
- sun projection + shading settings

Derived-only artifacts (never canonical persisted source data):
- solved roof planes
- generated roof/obstacle meshes
- shading grids / annual heatmap cells
- rendering buffers and map interaction state

## Runtime Boundaries

- `src/geometry/*`: pure deterministic geometry, solver, projection, sun math.
- `src/geometry/obstacles/*`: obstacle shape model + conversions for shading/mesh generation.
- `src/geometry/shading/*`: deterministic shade snapshot/grid/annual sun-access computations.
- `src/state/project-store/*`: reducer-based project state, persistence, share payload hydration.
- `src/app/hooks/*`: application orchestration (selection, interactions, compose UI models).
- `src/app/features/map-editor/*`: map interactions, drawing, hit-testing, camera/orbit tools.
- `src/rendering/roof-layer/*`: MapLibre custom layers for roof/obstacle meshes and roof heatmap overlays.
- `src/app/features/sun-tools/*`: projection, charts, weather forecast integration.
- `src/app/features/place-search/*`: Photon provider + search panel.

## Main Data Flows

1. Draw/edit footprint in map tools.
2. Draw/edit obstacles and write obstacle model state to project store.
3. Write footprint constraints, projection inputs, and shading settings to project store.
4. Solve roof plane in `useSolvedRoofEntries`.
5. Generate render meshes from solved planes (`roof`) and obstacle state (`obstacle`).
6. Compute live shading grid from solved roofs + obstacle volumes.
7. Optionally run annual simulation (batched sampling) and expose per-roof + per-cell sun access.
8. Render roof/obstacle meshes and display metrics/charts in sidebar/panels; shading overlays are produced through a dedicated overlay pipeline with layer-relative rebasing.

## Performance Model

- Live shading uses progressive compute: coarse during active geometry interaction, final resolution after interaction settles.
- Shading requests are memoized by deterministic geometry/time fingerprints.
- Annual simulation supports batched yielding and optional half-year mirroring to reduce compute cost.
- Heatmap overlay triangulation/projection is worker-first; worker failures stop heatmap processing and surface typed errors.
- Rendering layers share one Three.js renderer per WebGL context (ref-counted).
- Custom 3D map layers use per-layer anchor rebasing to keep vertex coordinates near zero and avoid float32 precision artifacts in Mercator world space.

## External Dependencies

- ArcGIS World Imagery tile source via MapLibre style.
- Photon geocoding API for place search.
- Open-Meteo irradiance forecast for weather-based chart.

## Reliability Model

- Geometry modules are pure functions and unit-tested.
- Runtime faults are reported through `AppErrorBoundary` and global error toasts.
- Operational failures use typed app errors (`code`, `severity`, `recoverable`, `context`) and `Result<T, E>` at storage/share/mesh/worker boundaries.
- Central `reportAppError` records failures; feature behavior is fail-closed for invalid state and processing errors.
- Map initialization failures are surfaced as typed app errors.
- Heatmap worker failures stop heatmap processing and surface explicit in-app error reporting.
- Project load path validates persisted payloads and rejects invalid state.
- Storage payloads are schema-versioned; unknown future schema versions are rejected to avoid silent corruption.
- External provider errors (search/forecast/share) are surfaced as typed errors without stale-data fallback.
