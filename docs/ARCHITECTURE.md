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
- sun projection settings, including datetime, daily date, and annual date window
- shading settings

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
- `src/app/editor-session/*`: ephemeral editing/session boundary for selection, drawing reducers, camera flags, input guards, and runtime selection selectors; currently implemented as React hooks plus reducer/selectors.
- `src/app/analysis/*`: derived computation boundary for solved roofs, heatmap mode, shading, annual simulation, sun-projection derived state, and diagnostics.
- `src/app/screens/*`: final screen composition plus runtime side-effect mounting.
- `src/app/features/*`: feature-owned controllers and UI composition.
- `src/app/hooks/*`: mixed application-orchestration boundary for constraint editing, share/runtime effects, and obstacle-mesh derivation.
- `src/app/clients/*`: thin external HTTP clients (request assembly, fetch, HTTP status handling, raw payload return).
- `src/app/globalServices/*`: browser-global services for share/hash decoding and toast dispatch.
- `src/shared/utils/*`: cross-cutting utility helpers; currently `projectRecovery.ts` coordinates reset/recovery flow alongside deterministic date/share helpers.
- `src/rendering/*`: reusable Three/MapLibre rendering primitives, shared world-geometry adapters, heatmap-overlay worker/build logic, and Three.js renderer lifecycle helpers.
- `src/app/components/*`: shared UI components and global error UI.
- `src/app/features/map-editor/*`: map interactions and runtime integration split into DrawTools, MapView, and MapObjects.
- `src/app/features/map-editor/MapView/useMapViewRuntime.ts`: shared map-view runtime state for orbit and map lifecycle flags.
- `src/app/features/map-editor/DrawTools/*`: drawing workflow controls, hints, and shortcuts.
- `src/app/features/map-editor/MapView/*`: base MapLibre runtime, base-style/sources, interactions, map-navigation runtime, camera/navigation sync, attribution UI.
- `src/app/features/map-editor/MapObjects/*`: rendered roof/obstacle meshes and heatmap layer synchronization.
- `src/app/features/share-project/*`: share URL assembly and browser share/clipboard behavior.
- `src/app/features/sun-tools/*`: projection controls, feature-owned selected-roof shaping, charts, weather forecast integration, and annual sun-access UI.
- `src/app/features/place-search/*`: place-search provider orchestration and UI mapping.
- `src/app/features/sidebar/*`: sidebar-owned panels, controllers, and command/state shaping for roof footprints, constraints, obstacles, and status metadata.
- `src/app/features/tutorial/*`: onboarding state + overlay UI.
- `src/app/screens/*`: final screen/layout composition.

### Boundary Remediation Status (2026-03-17)

Recent violations had accumulated in:
- `src/app/features/map-editor/MapView/hooks/useMapInstance.ts` (map init + custom-layer ownership mixed; remediated by moving object-layer lifecycle to `MapObjects`).
- feature providers with direct external `fetch` usage (remediated by extracting `src/app/clients/*`).
- `src/app/hooks/*` still holding session/runtime behavior that has not yet been moved into tighter owning boundaries.

Current and target direction:
- `SunCastScreen` is the top composition point and instantiates project, map-view, analysis, and editor runtime slices directly.
- `src/app/features/*` owns feature-specific controllers that shape UI props from explicit dependencies passed by the screen.
- `src/app/screens/*` stays thin and passes composed props into sidebar/canvas/tutorial screen components.
- session/runtime helpers still live in `app/hooks/*`, while sidebar-specific footprint/constraint/obstacle/selection command hooks live in `app/features/sidebar/*`.
- import direction is documented in `docs/runtime_boundaries.md`; treat it as the real current boundary map plus the intended cleanup direction.

## Main Data Flows

1. Map/UI interactions emit edit intents and update the composed store (document + editor session).
2. `state/project-store` owns persisted canonical inputs; `app/project-store` composes that document state with startup hydration/persistence wiring; `editor-session` owns transient runtime interaction state.
3. `analysis` derives solved roofs, selected roof inputs, sun-projection state, live shading, annual simulation, heatmap mode, and diagnostics from document + session guards.
4. Screen and feature controllers shape UI-facing contracts for sidebar/canvas/tutorial from document/session/analysis boundaries and wire runtime actions/effects.
5. `MapView` owns map runtime + interactions while `MapObjects/hooks` synchronize typed derived outputs into MapLibre/Three layers (roof/obstacle meshes + heatmap); `rendering/*` provides lower-level custom-layer primitives used there.
6. `app/clients` perform raw provider HTTP calls; feature modules apply retry/cache/mapping/observability policy.
7. `app/project-store/*`, `app/globalServices/*`, and `shared/utils/*` coordinate hash-share recovery, startup hydration, reset flow, and global toast side effects.
8. Storage/share persist and hydrate canonical document data; active/selection ids are intentionally non-canonical in persisted payloads.

## Presentation Composition

Current top-level composition is intentionally split:

```text
SunCastScreen
  -> useProjectStore()
  -> useMapViewRuntime()
  -> useEditModeState()
  -> useTutorialState()
  -> useGeometrySelectionState()
  -> useGeometryEditing()
  -> useAnalysis()
  -> SunCastEffects()
      -> useSunCastEffects()
  -> useDrawToolsController()
  -> useFootprintPanelController()
  -> useRoofEditorController()
  -> useObstaclePanelController()
  -> useStatusPanelController()
  -> useMapViewController()
  -> useSunToolsController()
  -> useTutorialControllerModel()
  -> SunCastSidebar()
  -> SunCastCanvas()
  -> TutorialController()
```

`SunCastScreen` owns the final runtime-to-screen wiring by composing explicit runtime slices and feature-owned controllers directly.

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
