# SunCast Runbook

## Prerequisites

- Node.js 20.x
- npm 9+

## Local Setup

```bash
npm ci
npm run dev
```

Vite default URL: `http://localhost:5173`

## Local Validation

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
npm run validate:repo
```

## CI Workflows

- `CI` (`.github/workflows/ci.yml`): lint + unit tests + build on PR and `main` pushes.
- `Validation` (`.github/workflows/validation.yml`): docs/handover structure checks on PRs.
- `Deploy to GitHub Pages` (`.github/workflows/deploy-pages.yml`): runs after successful `CI` on `main`.

## Deployment

GitHub Pages deploy uses:

- Node 20
- `VITE_BASE_PATH=/<repo-name>/`
- static artifact from `dist/`

Manual deployment trigger is available via `workflow_dispatch`.

## Primary E2E Specs

- `e2e/search-critical-editor-flow.spec.ts`
- `e2e/persistence-multi-footprint.spec.ts`
- `e2e/drawing-regressions.spec.ts`
- `e2e/annual-shading-simulation.spec.ts`

## Common Failures

1. Build fails on TypeScript errors:
   - Run `npm run build` locally and fix type regressions before PR.
2. Map not loading:
   - Check network access to tile providers.
   - App degrades to sidebar-only mode; reload after network recovers.
3. Basemap attribution provider text missing:
   - Verify ArcGIS metadata endpoint reachability (`World_Imagery/MapServer?f=pjson`).
   - Missing provider text is non-fatal; app still shows `Powered by Esri`.
4. Share action fails:
   - Browser may not support native share/clipboard APIs.
   - Use manual copy from URL bar as fallback.
5. Forecast/search errors:
   - External providers may be unavailable.
   - Core geometry workflow remains available.
6. Roof/obstacle/binary shaded-cell layer flicker, collapse, or disappearing thin geometry:
   - Verify layer-relative rebasing is still applied in `src/app/features/map-editor/MapObjects/layers/MapObjectMeshLayer.ts`, `src/app/features/map-editor/MapObjects/layers/ProjectedBinaryShadeLayer.ts`, and `src/rendering/shared/layerRebasing.ts`.
   - Run `src/rendering/shared/layerRebasing.test.ts`; if legacy anchor-plus-vertex math reappears, float32 precision can quantize 1 m spans to zero.
   - See `docs/bug/BUG-2026-03-13-layer-rebasing-precision.md` for full investigation and fix rationale.
