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
- `src/app/editor-session/*`: ephemeral editing/session boundary (selection/drafts/interaction UI state).
- `src/app/analysis/*`: derived computation boundary (solved roofs, live shading, annual simulation, heatmap mode, diagnostics).
- `src/app/presentation/*`: screen-facing composition models (`sidebar`, `canvas`, `tutorial`) consuming document/session/analysis contracts.
- `src/state/project-store/*`: reducer/commands/storage/share hydration; owns canonical project-document state and composes document + session reducers.
- `src/app/hooks/*`: thin compatibility/composition hooks (legacy entry points and feature hooks).
- `src/app/clients/*`: thin external HTTP clients (request assembly, fetch, HTTP status handling, raw payload return).
- `src/app/features/map-editor/*`: map interactions and runtime integration split into DrawTools, MapView, and MapObjects.
- `src/app/features/map-editor/DrawTools/*`: drawing workflow controls, hints, and shortcuts.
- `src/app/features/map-editor/MapView/*`: base MapLibre runtime, base-style/sources, interactions, camera/navigation sync, attribution UI.
- `src/app/features/map-editor/MapObjects/*`: rendered roof/obstacle meshes and heatmap layer synchronization.
- `src/app/features/sun-tools/*`: projection, charts, weather forecast integration.
- `src/app/features/place-search/*`: place-search provider orchestration + UI mapping.

### Boundary Remediation Status (2026-03-15)

Recent violations had accumulated in:
- `src/app/features/map-editor/MapView/hooks/useMapInstance.ts` (map init + custom-layer ownership mixed; remediated by moving object-layer lifecycle to `MapObjects`).
- feature providers with direct external `fetch` usage (remediated by extracting `src/app/clients/*`).

Target and active remediation direction:
- map bootstrapping and external runtime creation live under `src/adapters/map-runtime/*`.
- rendering lifecycle/custom map layers live under `src/rendering/*` and `src/app/features/map-editor/MapObjects/*`.
- presentation state remains a thin composition root delegating behavior into focused hooks/services.
- import direction is codified in `docs/runtime_boundaries.md` and enforced by lint restrictions.

## Main Data Flows

1. Map/UI interactions emit edit intents and update the composed store (document + editor session).
2. `project-store` owns persisted canonical inputs; `editor-session` owns transient runtime interaction state.
3. `analysis` derives solved roofs, selected roof inputs, live shading, annual simulation output, and typed diagnostics from document + session guards.
4. `presentation` shapes UI-facing contracts for sidebar/canvas/tutorial from document/session/analysis boundaries.
5. `MapView` owns map runtime + interactions while `MapObjects/hooks` synchronize typed derived outputs into MapLibre/Three layers (roof/obstacle meshes + heatmap).
6. `app/clients` perform raw provider HTTP calls; feature modules apply retry/cache/mapping/observability policy.
7. Storage/share persist and hydrate canonical document data; active/selection ids are intentionally non-canonical in persisted payloads.

## Presentation Composition

Current top-level composition is intentionally split:

```text
SunCastScreen
  -> useSunCastPresentationState()
      -> useProjectDocument()
      -> useEditorSession()
      -> useAnalysis()
  -> useSidebarModel()
  -> useCanvasModel()
  -> useTutorialModel()
```

`useSunCastController` remains as a thin compatibility wrapper over this composition.

## Performance Model

- Live shading uses progressive compute: coarse during active geometry interaction, final resolution after interaction settles.
- Shading requests are memoized by deterministic geometry/time fingerprints.
- Annual simulation supports batched yielding and optional half-year mirroring to reduce compute cost.
- Heatmap overlay triangulation/projection is worker-first; worker failures stop heatmap processing and surface typed errors.
- Rendering layers share one Three.js renderer per WebGL context (ref-counted).
- Custom 3D map layers use per-layer anchor rebasing to keep vertex coordinates near zero and avoid float32 precision artifacts in Mercator world space.

## External Dependencies

- ArcGIS World Imagery tile source (satellite basemap).
- OpenStreetMap raster tiles (streets basemap).
- ArcGIS attribution metadata endpoint for dynamic provider-credit text.
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
- External provider errors (search/forecast/attribution metadata) are surfaced as typed errors without mutating canonical state.
