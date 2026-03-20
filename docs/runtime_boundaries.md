# Runtime Boundaries

This document defines the active runtime/module boundaries for the current codebase.

If this document conflicts with higher-priority contracts, follow:
1. `docs/VENDOR_EXECUTION_GUARDRAILS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DECISIONS.md`

## Invariants

- Canonical persisted state is project inputs only: footprints, constraints, obstacles, and explicit sun/shading settings.
- Derived artifacts are never canonical persisted truth: solved planes, meshes, heatmap/grid outputs, map/view state, rendering buffers.
- Geometry computations run in local metric coordinates, not raw lon/lat.

## Module Boundaries

### `src/geometry/*` (Domain, pure deterministic)

Responsibilities:
- coordinate conversion (`lon/lat <-> local meters`)
- footprint/constraint validation
- plane solving and roof metrics
- roof/obstacle mesh generation inputs
- sun and shading math

Rules:
- pure functions only
- deterministic output for equal input
- no React/DOM/MapLibre/browser-storage dependencies
- no side effects or persistence
- shared deterministic helpers from `src/shared/utils/*` are currently used here for date/time and error/result primitives; keep those helpers UI-free

### `src/state/project-store/*` (Canonical project document + persistence)

Responsibilities:
- reducer-driven project transitions and commands
- selectors for canonical project state
- storage schema migration/sanitization
- share payload import/export mapping

Rules:
- authoritative owner of canonical project inputs
- fail-closed on unknown future schema versions
- must not persist solved geometry/meshes/heatmap outputs
- must not import `src/app/*`
- runtime selection/session selectors do not belong here; they live with `src/app/editor-session/*`

### `src/app/project-store/*` (Store composition + startup hydration)

Responsibilities:
- compose canonical project-document transitions with editor-session transitions
- own `useProjectStore` / `useProjectDocument` runtime hooks
- run startup hydration and persistence side effects

Rules:
- may depend on `src/state/project-store/*`, `src/app/editor-session/*`, and `src/app/globalServices/*`
- must keep browser/runtime effects out of `src/state/project-store/*`
- must not redefine canonical document rules owned by `src/state/project-store/*`

### `src/app/editor-session/*` (Ephemeral editing state)

Responsibilities:
- transient selection/draft/interaction state
- editor interaction guards and reducer/selectors
- runtime selection selectors for active footprint/obstacle state

Rules:
- never persisted as canonical project data
- may consume project document contracts
- must not implement geometry solving/shading math

### `src/app/analysis/*` (Derived computation boundary)

Responsibilities:
- derive solved roofs and metrics from canonical inputs
- derive shading inputs/outputs and annual simulation data
- expose diagnostics and typed derived outputs

Rules:
- outputs are derived-only artifacts
- consume geometry + project/session contracts
- owns shading, annual simulation, and sun-projection derived state for presentation consumers
- no UI rendering concerns

### `src/app/screens/*` (Screen composition boundary)

Responsibilities:
- compose the final screen tree
- own runtime side-effect mounting and explicit dependency composition
- wire feature controllers into screen-level components

Rules:
- no domain solver/shading math
- no map engine lifecycle ownership
- screen components should stay thin and delegate state shaping to feature controllers

### `src/app/features/*` (Feature-owned UI controllers)

Responsibilities:
- shape UI props from explicit dependencies passed by the screen
- keep feature-specific logic close to the consuming panels/overlays
- avoid reintroducing a mega presentation model

Rules:
- no domain solver/shading math
- no canonical state ownership
- do not couple unrelated feature controllers together

### `src/app/hooks/*` (Application orchestration)

Responsibilities:
- feature orchestration hooks (shading, annual simulation, sharing, keyboard, selection state)
- editor-session helpers (`useConstraintEditor`, `useSelectionState`)
- runtime/effect support (`useSunCastEffects`, obstacle mesh derivation)
- shared geometry helpers consumed by screens/features (`activeFootprintGeometry`)

Rules:
- this folder is still a mixed boundary in the current app, not only a thin compatibility layer
- orchestrate flows; do not become the default sink for new business logic
- no direct geometry algorithm implementations
- long-running work must preserve UI responsiveness
- sidebar-specific footprint, constraint, obstacle, selection, and active-footprint state/metric hooks now live in `src/app/features/sidebar/*`

### `src/app/features/sidebar/*` (Sidebar UI controllers)

Responsibilities:
- sidebar panels for footprints, obstacles, roof constraints, selection, and status
- sidebar-specific command and state shaping for active footprint, obstacle, constraint, and selection edits
- feature-local composition around the sidebar app context

Rules:
- no domain solver/shading math
- no canonical state ownership
- keep sidebar-specific editing behavior close to the panels that consume it

### `src/app/clients/*` (External HTTP transport)

Responsibilities:
- external endpoint URL ownership
- query param assembly
- HTTP request execution and response status validation
- return raw provider payloads

Rules:
- no business/domain mapping
- no retry/cache policy (feature modules own policy)
- no UI concerns or toasts

### `src/app/globalServices/*` (Browser-global app services)

Responsibilities:
- share/hash payload decode entry points
- toast action dispatch bridges

Rules:
- browser/runtime side effects are allowed here
- no geometry solving or rendering ownership

### `src/application/services/*` (Cross-cutting app services)

Responsibilities:
- small application flows that do not fit a single feature; currently project reset/recovery

Rules:
- may coordinate store/session/global-service calls
- should stay thin and explicit; do not turn into a second generic hooks bucket

### `src/adapters/*` (Platform adapters)

Responsibilities:
- platform library wrappers; currently MapLibre runtime creation/disposal

Rules:
- encapsulate third-party runtime setup details
- no ownership of project/document state

### `src/app/features/map-editor/*` (Map interaction + rendering integration)

Responsibilities:
- MapLibre lifecycle and interaction handling
- drawing/edit intents and hit-testing
- camera/navigation/orbit integration
- custom 3D layer synchronization under `MapObjects/*`
- basemap visibility switching + attribution display

Rules:
- emit/edit intents; do not redefine domain/solver rules
- geometry consumed from derived outputs only
- rendering math here is adapter/render plumbing, not canonical geometry solving

### `src/app/editor-session/*` (Ephemeral editing/session state)

Responsibilities:
- roof drawing session transitions
- obstacle drawing session transitions
- obstacle selection session transitions
- draft point lifecycle and draw-completion selection shaping
- transient selection state and runtime selection selectors

Rules:
- no canonical project document ownership
- no geometry solving or mesh generation
- keep session state transitions close to the session boundary

### `src/app/features/map-editor/MapView/*` (Map runtime boundary)

Responsibilities:
- map init/dispose (`useMapInstance`)
- map-view runtime state (`useMapViewRuntime`)
- style/sources and map controls
- interactions, orbit/sun camera sync, map navigation runtime sync

Rules:
- does not own roof/obstacle/heatmap custom-layer lifecycle
- does not implement domain geometry algorithms

### `src/app/features/map-editor/MapObjects/*` (Map object rendering boundary)

Responsibilities:
- custom 3D layers for roof meshes, obstacle meshes, roof heatmap overlay
- visibility synchronization from presentation/analysis state

Rules:
- consumes derived meshes/heatmap features only
- no ownership of canonical persisted state
- no map interaction intent handling

### `src/app/features/sun-tools/*` (Sun-tools UI + forecast integration)

Responsibilities:
- sun/date controls and projection UI
- annual simulation UI orchestration
- feature-owned selected-roof shaping for charts/forecast inputs
- forecast fetch/presentation (via `app/clients`)

Rules:
- external data is advisory, non-canonical
- external failures must surface as typed app errors

### `src/app/features/place-search/*` (Search integration)

Responsibilities:
- provider orchestration for place search
- request retry/observability policy
- search panel UI and typed mapping
- map-navigation runtime shaping from place-search selection

Rules:
- uses `src/app/clients/photonClient.ts` for transport
- provider failures must degrade gracefully
- search results must not mutate canonical geometry implicitly

### `src/app/features/share-project/*` (Share action feature)

Responsibilities:
- share URL assembly from canonical project inputs
- browser share / clipboard fallback behavior
- user-facing share success/error reporting

Rules:
- uses canonical project state only
- must not persist derived geometry as share source
- share failures must degrade gracefully

### `src/app/features/tutorial/*` (Onboarding)

Responsibilities:
- tutorial progression and overlay behavior

Rules:
- consumes app state/events
- does not own geometry or persistence behavior

### `src/app/components/*` (Shared UI components)

Responsibilities:
- reusable UI widgets
- global runtime error UI and toast display

Rules:
- may depend on shared/app contracts
- must not become a geometry or persistence boundary

### `src/app/screens/*` (Screen assembly)

Responsibilities:
- final page/layout composition

Rules:
- assemble screen-level components and feature controllers
- no solver/shading implementation

### `src/rendering/*` (Rendering primitives)

Responsibilities:
- reusable custom-layer and heatmap geometry rendering primitives
- Three.js / MapLibre render-path code shared by map-object features

Rules:
- should consume derived render inputs only
- must not own canonical state
- may own shared world-geometry adapters, layer rebasing helpers, worker entry points, and WebGL renderer lifecycle code used by map-object features

### `src/shared/*` (Cross-cutting contracts/utilities)

Responsibilities:
- typed app error/result primitives
- observability/reporting bridges
- deterministic utility helpers (`shareCodec`, cache key builders)

Rules:
- no feature-specific UI ownership
- utility behavior must remain deterministic where used for cache/storage/share contracts

### `src/types/*` (Shared type contracts)

Responsibilities:
- domain/app/screen/feature type contracts

Rules:
- type-only/shared contracts, no runtime side effects

## Dependency Direction (Observed)

Preferred direction:

`geometry -> state -> analysis -> screens/features`

Current app also has side-channel boundaries:

`shared/types` support every layer
`clients/adapters/globalServices` sit beside the main flow for platform and transport work
`app/hooks` is still a mixed orchestration layer used by `analysis`, `screens`, and `editor-session`
`rendering` is consumed by `MapObjects` and stays below app/features in the import graph

Observed imports by boundary:
- `geometry/*` imports `types/*` plus selected `shared/utils/*` and `shared/errors/*` helpers, in addition to internal geometry modules.
- `state/project-store/*` imports `types/*`, `geometry/*`, and `shared/*`.
- `app/project-store/*` imports `state/project-store/*`, `app/editor-session/*`, `app/globalServices/*`, `shared/*`, and React runtime APIs.
- `app/editor-session/*` imports `types/*`, `state/project-store/*` contracts, and selected `app/hooks/*`.
- `app/analysis/*` imports `geometry/*`, `types/*`, `state/project-store/*`, and `shared/*`.
- `app/hooks/*` imports `state/project-store/*`, `geometry/*`, `shared/*`, `app/globalServices/*`, and selected feature contracts.
- `app/clients/*` currently uses browser/web APIs such as `fetch`, `AbortSignal`, and `URL`, plus `shared/*` and `types/*`.
- `app/globalServices/*` imports browser APIs, `shared/*`, and `state/project-store/*`.
- `application/services/*` currently imports `app/globalServices/*`.
- `adapters/*` currently wraps platform libraries only.
- `rendering/*` imports `types/*` and `shared/*`, plus rendering-internal helpers.
- `app/components/*` imports `shared/*`, `types/*`, and selected app/feature contracts.
- `app/features/*` imports a mix of `hooks/*`, `clients/*`, platform libraries, and in `sun-tools/*` also selected `geometry/*` types/helpers.
- `app/screens/*` imports provider/effect modules and feature components.

Disallowed:
- `geometry/*` importing React/MapLibre/browser APIs
- UI/features/screens implementing solver or shading algorithms
- rendering/map layers becoming canonical state owners
- persistence/share storing derived meshes/planes/heatmap grids
- features bypassing `app/clients/*` and inlining provider HTTP transport
- `app/hooks/*` importing `app/screens/*`
- direct `geometry/*` imports from `app/features/sun-tools/*` remain current-state exceptions only; do not spread that pattern further without an explicit boundary decision

## Runtime Notes

- Browser-only/platform APIs (`window`, clipboard, share, compression streams, MapLibre, WebGL workers) stay in app/features/hooks/clients layers.
- Worker boundaries must return typed errors and fail closed for unsupported/failed worker operations.
- Schema/share migrations must reject unknown future versions to prevent silent corruption.
