# Agents Guide (AI + human contributors)

This repository builds a React application for dimension-accurate roof and obstacle modeling on a map.

Golden rule: source of truth is geometry + constraints. Generated meshes/heatmaps are derived only.

## Read First

`AGENTS.md` is an entry document, not the full contract.

Required docs before code changes:

### Core Contract
- `README.md`
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/runtime_boundaries.md`
- `docs/DECISIONS.md`
- `docs/FEATURES.md`

### Delivery Contract
- `docs/VENDOR_HANDOVER.md`
- `docs/PR.md`
- `docs/RUNBOOK.md`
- `docs/TEST_STRATEGY.md`
- `docs/VENDOR_EXECUTION_GUARDRAILS.md`

### Iteration Context (non-canonical)
- `docs/product/UC*`
- `docs/product/IP*`

## Priority When Docs Conflict

1. `docs/VENDOR_EXECUTION_GUARDRAILS.md`
2. `docs/ARCHITECTURE.md` and `docs/runtime_boundaries.md`
3. `docs/DECISIONS.md`
4. `docs/TEST_STRATEGY.md` and `docs/PR.md`
5. `README.md` and `docs/FEATURES.md`
6. iteration docs (`UC*`, `IP*`)

## Quick Workflow

1. Understand geometry model
   - footprint polygon
   - vertex/edge constraints
   - plane solver -> roof mesh
2. Read architecture boundaries
3. Read delivery/test guardrails
4. Implement domain logic before UI wiring
5. Keep solver logic out of UI
6. Persist canonical inputs only

## Repository Map (Current)

```text
src/
  app/
    clients/
    features/
      map-editor/
        DrawTools/
        MapView/
        MapObjects/
      place-search/
      sun-tools/
    analysis/
    editor-session/
    presentation/
  geometry/
  rendering/
  state/
  shared/
  types/
docs/
```

## Architecture Principles

### Geometry-First

Everything derives from:

```text
footprint polygon
+ height constraints
+ obstacle inputs
-------------------
solved roofs + metrics
+ meshes + overlays
```

### Coordinate System

All geometry computations run in meters:

```text
lon/lat -> local planar meters -> solve/shading -> render back on map
```

Never run solver/shading math directly in lon/lat.

## Coding Rules

### Geometry Engine
- pure functions
- deterministic output
- no UI dependencies

If geometry behavior changes, update tests in the same PR and refresh docs (`ARCHITECTURE.md`, `DECISIONS.md`) when boundaries/rules change.

### UI Responsibilities
- gather user inputs/intents
- show derived geometry state
- delegate business logic to domain/application boundaries

UI must not implement solver/shading algorithms.

### Rendering
- consume solver/analysis outputs only
- never become canonical state owner

## Validation Rules

Reject geometry when:
- footprint self-intersects
- polygon has fewer than 3 vertices
- constraints are insufficient to define a plane

Warn when:
- constraints are over-constrained
- solver uses least-squares fallback

## Definition Of Done

At minimum:
- deterministic geometry behavior preserved
- solver logic remains separate from UI
- meshes/heatmaps regenerated from canonical inputs
- coordinate conversions are explicit
- behavior change has proportional tests
- affected docs are updated in same PR

For risky work, proof must align with:
- `docs/TEST_STRATEGY.md`
- `docs/RUNBOOK.md`
- `docs/VENDOR_EXECUTION_GUARDRAILS.md`

## Final Pre-Merge Questions

- Did canonical state rules remain intact?
- Did UI avoid implementing geometry logic?
- Did runtime boundaries remain clean?
- Did browser/runtime assumptions change?
- Did docs stay current?
- Is test evidence proportional to risk?
