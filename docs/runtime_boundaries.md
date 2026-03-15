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

### `src/state/project-store/*` (Canonical project document + persistence)

Responsibilities:
- reducer-driven project transitions and commands
- canonical state projection (`useProjectDocument`)
- storage schema migration/sanitization
- share payload import/export mapping

Rules:
- authoritative owner of canonical project inputs
- fail-closed on unknown future schema versions
- must not persist solved geometry/meshes/heatmap outputs
- may compose `src/app/editor-session/*` reducer state, but session fields remain non-canonical

### `src/app/editor-session/*` (Ephemeral editing state)

Responsibilities:
- transient selection/draft/interaction state
- editor interaction guards and reducer/selectors

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
- no UI rendering concerns

### `src/app/presentation/*` (Screen-facing model composition)

Responsibilities:
- compose presentation state from document/session/analysis
- build typed sidebar/canvas/tutorial models
- bridge action handlers for screens

Rules:
- no domain solver/shading math
- no map engine lifecycle ownership
- boundary immediately before screen components

### `src/app/hooks/*` (Application orchestration)

Responsibilities:
- feature orchestration hooks (shading, annual simulation, sharing, keyboard, selection)
- compatibility composition (`useSunCastController` over presentation hooks)

Rules:
- orchestrate flows; do not become business-logic sink
- no direct geometry algorithm implementations
- long-running work must preserve UI responsiveness

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

### `src/app/features/map-editor/MapView/*` (Map runtime boundary)

Responsibilities:
- map init/dispose (`useMapInstance`)
- style/sources and map controls
- interactions, orbit/sun camera sync, map navigation sync

Rules:
- does not own roof/obstacle/heatmap custom-layer lifecycle
- does not implement domain geometry algorithms

### `src/app/features/map-editor/MapObjects/*` (Map object rendering boundary)

Responsibilities:
- custom 3D layers for roof meshes, obstacle meshes, roof heatmap overlay
- layer-relative rebasing and render-geometry adapters
- visibility synchronization from presentation/analysis state

Rules:
- consumes derived meshes/heatmap features only
- no ownership of canonical persisted state
- no map interaction intent handling

### `src/app/features/sun-tools/*` (Sun-tools UI + forecast integration)

Responsibilities:
- sun/date controls and projection UI
- annual simulation UI orchestration
- forecast fetch/presentation (via `app/clients`)

Rules:
- external data is advisory, non-canonical
- external failures must surface as typed app errors

### `src/app/features/place-search/*` (Search integration)

Responsibilities:
- provider orchestration for place search
- request retry/observability policy
- search panel UI and typed mapping

Rules:
- uses `src/app/clients/photonClient.ts` for transport
- provider failures must degrade gracefully
- search results must not mutate canonical geometry implicitly

### `src/app/features/tutorial/*` (Onboarding)

Responsibilities:
- tutorial progression and overlay behavior

Rules:
- consumes app state/events
- does not own geometry or persistence behavior

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
- domain/app/presentation type contracts

Rules:
- type-only/shared contracts, no runtime side effects

## Dependency Direction (Allowed)

Preferred direction:

`geometry -> state/analysis -> presentation/hooks -> features/screens`

Allowed imports by boundary:
- `geometry/*` -> `types/*` only (plus internal geometry modules)
- `state/project-store/*` -> `types/*`, `geometry/*`, `shared/*`, `app/editor-session/*`
- `app/editor-session/*` -> `types/*`, `state/project-store/*` contracts
- `app/analysis/*` -> `geometry/*`, `types/*`, `state/project-store/*`, `shared/*`, selected `app/hooks/*`
- `app/presentation/*` -> `app/analysis/*`, `state/project-store/*`, `app/editor-session/*`, `app/hooks/*`, `shared/*`
- `app/hooks/*` -> `state/project-store/*`, `geometry/*`, `shared/*`, feature contracts
- `app/clients/*` -> browser platform APIs + `shared/*`/`types/*` only
- `app/features/*` + `app/screens/*` -> presentation/hook contracts + clients + platform libraries

Disallowed:
- `geometry/*` importing React/MapLibre/browser APIs
- UI/features/screens implementing solver or shading algorithms
- rendering/map layers becoming canonical state owners
- persistence/share storing derived meshes/planes/heatmap grids
- features bypassing `app/clients/*` and inlining provider HTTP transport

## Runtime Notes

- Browser-only/platform APIs (`window`, clipboard, share, compression streams, MapLibre, WebGL workers) stay in app/features/hooks/clients layers.
- Worker boundaries must return typed errors and fail closed for unsupported/failed worker operations.
- Schema/share migrations must reject unknown future versions to prevent silent corruption.
