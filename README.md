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

## Production core and CLI

`src/core` is the shared production module used by the React app and the CLI.
It owns forecast aggregation, the Open-Meteo/PVGIS providers, and the
machine-readable assumptions from `docs/MEASUREMENTS.md`; it does not own
canonical project persistence or UI state.

`suncast-cli` is a Node.js 20+ package prepared for npm publication. Its distribution bundles
the production core, so installing it does not pull React, MapLibre, Three.js,
or the application source tree. It exposes the core at `suncast-cli` (and
`suncast-cli/core`) and installs the `suncast` executable.

The CLI accepts a JSON file with an array of solved roof inputs
(`SelectedRoofSunInput` shape). It uses the current local date by default; pass
`--date` with an ISO date (`YYYY-MM-DD`) to choose the forecast day explicitly.
Forecast hours are returned and displayed in the local timezone of each roof.
Any legacy `createdDateTime` field in an exported JSON file is treated as
metadata and does not affect the report date.

```bash
npx suncast-cli report ./forecast-input.json --format table
npx suncast-cli report ./forecast-input.json --format json
npx suncast-cli report ./forecast-input.json --date 2026-09-23 --format table
```

In the web app, select solved roof polygons, then choose **Export CLI JSON** in
the **Day Estimated (Weather Forecast, UTC)** panel.
The browser downloads `suncast-forecast-YYYY-MM-DD.json`, ready for either
command above. The export contains derived report input only; it does not alter
the persisted SunCast project.

For local development use `npm run cli -- …`. Public installation with `npx
suncast-cli` becomes available after the first npm release. The release workflow
is triggered by a version tag (`v<package-version>`) after npm trusted publishing,
a license, and an npm package owner have been configured; see `docs/RUNBOOK.md`.

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
