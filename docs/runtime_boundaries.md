# Runtime Boundaries

This document defines Stage 1 runtime boundaries and references current code paths.

## Geometry Domain (`src/geometry/*`)

Source of truth:
- footprint polygon
- height constraints

Responsibilities:
- coordinate projection (`lon/lat -> local meters`)
- footprint validation
- plane solving and metrics
- mesh generation inputs
- sun/irradiance calculations

Rules:
- pure functions only
- deterministic output for equal input
- no UI/browser dependencies

## App State (`src/state/project-store/*`)

Responsibilities:
- reducer transitions and command-style state updates
- active/selected footprint management
- persistence load/save and sanitization
- share payload mapping/import

Rules:
- state is authoritative for geometry inputs
- persisted data stores constraints and footprint data, not generated mesh

## App Orchestration (`src/app/hooks/*`)

Responsibilities:
- compose sidebar/canvas/tutorial view models
- coordinate selection, constraints editing, keyboard shortcuts
- trigger share and sun tools behavior

Rules:
- orchestration may call geometry/store modules
- orchestration must not contain solver math

## Map Interaction (`src/app/features/map-editor/*`)

Responsibilities:
- MapLibre lifecycle
- drawing/editing input capture
- hit-testing, drag interactions, orbit controls
- map overlays and source updates

Rules:
- map layer emits user intents/events
- map layer does not implement geometry solver logic

## Forecast Integration (`src/app/features/sun-tools/*`)

Responsibilities:
- fetch weather forecast from Open-Meteo
- convert weather + solved orientation into estimated PV output

Rules:
- forecast output is advisory and non-authoritative for geometry
- failures degrade to non-fatal status and clear-sky panels remain available

## Tutorial (`src/app/features/tutorial/*`)

Responsibilities:
- onboarding overlays and progression
- track milestones from app state/events

Rules:
- tutorial reads app state
- tutorial does not own geometry logic or persistence

## Debug / Development-Only

Development-only tools:
- `DevTools` panel
- `window.suncastDebug` API
- roof debug simulation

Rule:
- all debug paths must be gated by `import.meta.env.DEV`
