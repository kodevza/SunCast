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
- `src/state/project-store/*`: reducer/commands/selectors/storage/share mapping for canonical project-document state. It does not import `app/*`.
- `src/app/project-store/*`: application-level store composition and startup hydration. It composes canonical document transitions with editor-session runtime state and browser-facing hydration/persistence entry points.
- `src/app/editor-session/*`: ephemeral editing/session boundary for selection, camera flags, and input guards; currently implemented as React hooks plus reducer/selectors.
- `src/app/analysis/*`: derived computation boundary for solved roofs, heatmap mode, shading, annual simulation, sun-projection derived state, and diagnostics.
- `src/app/presentation/*`: screen-facing composition models (`sidebar`, `canvas`, `tutorial`) plus the thin `useSunCastController` compatibility composition that consumes document/session/analysis contracts and runtime action/effect hooks.
- `src/app/hooks/*`: mixed application-orchestration boundary for selection, constraint editing, share/runtime effects, and obstacle-mesh derivation.
- `src/app/clients/*`: thin external HTTP clients (request assembly, fetch, HTTP status handling, raw payload return).
- `src/app/globalServices/*`: browser-global services for share/hash decoding and toast dispatch.
- `src/application/services/*`: small cross-cutting application services; currently `projectRecovery.ts` coordinates reset/recovery flow.
- `src/adapters/*`: platform adapter wrappers; currently only `map-runtime` around MapLibre creation/disposal.
- `src/rendering/*`: reusable Three/MapLibre rendering primitives, shared world-geometry adapters, heatmap-overlay worker/build logic, and Three.js renderer lifecycle helpers.
- `src/app/components/*`: shared UI components and global error UI.
- `src/app/features/map-editor/*`: map interactions and runtime integration split into DrawTools, MapView, and MapObjects.
- `src/app/features/map-editor/DrawTools/*`: drawing workflow controls, hints, and shortcuts.
- `src/app/features/map-editor/MapView/*`: base MapLibre runtime, base-style/sources, interactions, camera/navigation sync, attribution UI.
- `src/app/features/map-editor/MapObjects/*`: rendered roof/obstacle meshes and heatmap layer synchronization.
- `src/app/features/sun-tools/*`: projection, charts, weather forecast integration.
- `src/app/features/place-search/*`: place-search provider orchestration + UI mapping.
- `src/app/features/sidebar/*`: sidebar editors/panels for constraints, obstacles, status, and roof metadata.
- `src/app/features/tutorial/*`: onboarding state + overlay UI.
- `src/app/screens/*`: final screen/layout composition.

### Boundary Remediation Status (2026-03-17)

Recent violations had accumulated in:
- `src/app/features/map-editor/MapView/hooks/useMapInstance.ts` (map init + custom-layer ownership mixed; remediated by moving object-layer lifecycle to `MapObjects`).
- feature providers with direct external `fetch` usage (remediated by extracting `src/app/clients/*`).
- `src/app/hooks/*` still holding session/runtime behavior that has not yet been moved into tighter owning boundaries.

Current and target direction:
- `useSunCastController` now lives in `app/presentation/*` as a thin wrapper over presentation models.
- presentation state remains the main composition root, but session/runtime helpers still live in `app/hooks/*`.
- import direction is documented in `docs/runtime_boundaries.md`; treat it as the real current boundary map plus the intended cleanup direction.

## Main Data Flows

1. Map/UI interactions emit edit intents and update the composed store (document + editor session).
2. `state/project-store` owns persisted canonical inputs; `app/project-store` composes that document state with startup hydration/persistence wiring; `editor-session` owns transient runtime interaction state.
3. `analysis` derives solved roofs, selected roof inputs, sun-projection state, live shading, annual simulation, heatmap mode, and diagnostics from document + session guards.
4. `presentation` shapes UI-facing contracts for sidebar/canvas/tutorial from document/session/analysis boundaries and wires runtime actions/effects.
5. `MapView` owns map runtime + interactions while `MapObjects/hooks` synchronize typed derived outputs into MapLibre/Three layers (roof/obstacle meshes + heatmap); `rendering/*` provides lower-level custom-layer primitives used there.
6. `app/clients` perform raw provider HTTP calls; feature modules apply retry/cache/mapping/observability policy.
7. `app/project-store/*`, `app/globalServices/*`, and `application/services/*` coordinate hash-share recovery, startup hydration, reset flow, and global toast side effects.
8. Storage/share persist and hydrate canonical document data; active/selection ids are intentionally non-canonical in persisted payloads.

## Presentation Composition

Current top-level composition is intentionally split:

```text
SunCastScreen
  -> useSunCastController()
      -> useSunCastPresentationState()
          -> useProjectDocument()
          -> useEditorSession()
          -> useAnalysis()
      -> useSidebarModel()
      -> useCanvasModel()
      -> useTutorialModel()
```

`useSunCastController` remains as a thin compatibility wrapper over this composition, but it is owned by `app/presentation/*` rather than `app/hooks/*`.

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
