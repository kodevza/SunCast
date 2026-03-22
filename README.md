# SunCast - Geometry-First Roof Modeling and Solar Analysis

SunCast is a React + TypeScript app for drawing roof/obstacle geometry on a map and computing deterministic roof metrics, shading preview, and annual sun-access outputs.

Live demo: [SunCast Demo](https://kodevza.github.io/SunCast/)

## Core Principles

- geometry + constraints are canonical state
- meshes and shading overlays are derived artifacts
- solvers run in local metric coordinates (not raw lon/lat)

## Main Capabilities

- roof footprint drawing and editing
- obstacle drawing/editing (type + height)
- vertex/edge height constraints
- planar roof solve with pitch/azimuth metrics
- orbit 3D mesh visualization
- live roof shading preview
- annual sun-access simulation
- basemap switch (`Satellite` / `Streets`)
- visible basemap attribution control
- place search (Photon)
- weather forecast integration (Open-Meteo)
- multi-footprint persistence and shareable URL payload

## Tech Stack

- React
- TypeScript
- Vite
- MapLibre GL + Three.js custom layers
- Vitest
- Playwright

## Requirements

- Node.js >= 20
- npm >= 9

## Setup

```bash
npm ci
npm run dev
```

Default local URL: `http://localhost:5173`

## Validation Commands

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
npm run validate:repo
```

Coverage-oriented e2e run:

```bash
npm run coverage:e2e
```

## Project Structure (High Level)

```text
src/
  app/
    clients/
    project-store/
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

## Documentation Order

Read these first before changing behavior:

1. `docs/VENDOR_EXECUTION_GUARDRAILS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/runtime_boundaries.md`
4. `docs/DECISIONS.md`
5. `docs/TEST_STRATEGY.md`
6. `docs/PR.md`

Iteration docs (`docs/product/UC*`, `docs/product/IP*`) are context, not the canonical contract.
