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

## Common Failures

1. Build fails on TypeScript errors:
   - Run `npm run build` locally and fix type regressions before PR.
2. Map not loading:
   - Check network access to tile provider.
   - App degrades to sidebar-only mode; reload after network recovers.
3. Share action fails:
   - Browser may not support native share/clipboard APIs.
   - Use manual copy from URL bar as fallback.
4. Forecast/search errors:
   - External providers may be unavailable.
   - Core geometry workflow remains available.
5. Roof/obstacle/heatmap layer flicker, collapse, or disappearing thin geometry:
   - Verify layer-relative rebasing is still applied in `src/rendering/roof-layer/RoofMeshLayer.ts` and `src/app/features/map-editor/MapView/useMapInstance.ts`.
   - Run `src/rendering/roof-layer/layerRebasing.test.ts`; if legacy anchor-plus-vertex math reappears, float32 precision can quantize 1 m spans to zero.
   - See `docs/bug/BUG-2026-03-13-layer-rebasing-precision.md` for full investigation and fix rationale.
