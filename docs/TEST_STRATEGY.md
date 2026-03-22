# SunCast Test Strategy (Playwright-First)

## Goals

1. Validate user-visible behavior end-to-end in a real browser.
2. Keep geometry logic deterministic and correct.
3. Measure code coverage from Playwright runs as the primary metric.

## Testing Pyramid For This Project

1. Playwright E2E (primary)
   - covers the full stack: UI, map interactions, state, solver integration, rendering overlay
   - coverage reports are generated from these tests
2. Pure geometry and orchestration unit tests (secondary)
   - cover numeric edge cases, deterministic fixtures, and boundary logic that is expensive to isolate via E2E
   - unit coverage is supportive, not the release gate

## E2E Suite (Current Required Specs)

1. `e2e/search-critical-editor-flow.spec.ts`
   - place search (`Warsaw`) -> draw roof -> constraints -> obstacle -> orbit/sun interactions
2. `e2e/persistence-multi-footprint.spec.ts`
   - multi-footprint creation, selection, reload persistence, deletion
3. `e2e/drawing-regressions.spec.ts`
   - drawing determinism and constrained-length commit behavior
4. `e2e/annual-shading-simulation.spec.ts`
   - annual simulation execution, heatmap generation, output changes from obstacle height changes

Legacy e2e specs (`roof-orbit.spec.ts`, `uc-strategy.spec.ts`) are intentionally removed.

## Unit Test Scope (Must Keep Strong)

1. Plane/mesh core:
   - `fitPlane`, `solveRoofPlane`, roof metrics, `generateRoofMesh`
2. Shading engine:
   - snapshot/annual deterministic fixtures in `src/geometry/shading/*`
   - “sun-behind-plane not counted as direct sun access” regressions
3. Map object rendering math:
   - layer rebasing precision guard (`rendering/shared/layerRebasing.test.ts`)
   - world mesh conversion and projected binary shaded-cell overlay tests
4. Client transport boundaries:
   - `src/app/clients/photonClient.test.ts`
   - `src/app/clients/openMeteoClient.test.ts`
5. Basemap + attribution boundaries:
   - `MapView/createMapStyle.test.ts`
   - `MapView/MapAttributionControl.test.ts`

## Determinism Rules

- correctness tests for shading/annual simulation should prefer real engine paths and deterministic fixtures over broad mocks.
- same input must yield same metrics (hours/ratios/shaded-cell output).
- cache tests must verify identity reuse for unchanged fingerprints and invalidation on cache revision changes.

## Coverage Policy

Coverage is generated from Playwright runs:

1. run instrumented app in Vite `coverage` mode
2. Playwright writes browser Istanbul blobs to `.nyc_output/`
3. `nyc report` produces:
   - `coverage/index.html`
   - `coverage/lcov.info`
   - text summary in CI logs

Recommended gates (current baseline):

1. Global: Lines >= 75%, Branches >= 65%, Functions >= 75%.
2. Critical geometry modules: Lines >= 90%.

Raise thresholds as suite signal improves.

## Commands

```bash
npm run test:e2e
npm run test:e2e:coverage
npm run coverage:e2e:report
npm run coverage:e2e
npm run test
```

## CI Order

1. `npm run lint`
2. `npm run test` (unit + deterministic geometry correctness)
3. `npm run coverage:e2e` (Playwright + coverage report)

## Notes

1. Geometry remains source-of-truth: E2E assertions should verify geometry outputs/metrics, not mesh internals only.
2. Prefer stable `data-testid` selectors and deterministic map interactions.
3. For visual checks, use bounded ROI checks (e.g., heatmap canvas variance), not fragile full-frame screenshots.
