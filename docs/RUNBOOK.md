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

## Git hooks and secret scanning

`npm install` activates the repository hooks by setting `core.hooksPath` to
`.githooks`. Before the existing lint/test/build gate, pre-commit blocks staged
secrets with [Gitleaks](https://github.com/gitleaks/gitleaks):

```bash
gitleaks git --pre-commit --redact --staged --verbose --config .gitleaks.toml
```

Gitleaks is deliberately a required local tool. Install it before committing;
the hook fails closed when it is unavailable. Do not bypass it with
`--no-verify`. The pre-push hook runs the production build.

## CI Workflows

- `CI` (`.github/workflows/ci.yml`): lint + unit tests + build on PR and `main` pushes.
- `Validation` (`.github/workflows/validation.yml`): docs/handover structure checks on PRs.
- `Deploy to GitHub Pages` (`.github/workflows/deploy-pages.yml`): runs after successful `CI` on `main`.
- `Publish npm package` (`.github/workflows/publish-npm.yml`): validates and publishes the CLI when a matching version tag is pushed.

## Deployment

GitHub Pages deploy uses:

- Node 20
- `VITE_BASE_PATH=/<repo-name>/`
- static artifact from `dist/`

Manual deployment trigger is available via `workflow_dispatch`.

## npm CLI release

`suncast-cli` is an npm package that bundles its Node.js production core and
the `suncast` executable. The bundle must remain free of React, MapLibre,
Three.js, browser storage, and canonical project-state dependencies.

Before publishing:

```bash
npm run lint
npm run test
npm run build
npm run build:package
npm pack --dry-run
```

Before the first public release:

1. Choose and commit a license, then add its SPDX identifier to `package.json`.
2. Publish the first version manually from the intended npm owner account. npm
   trusted publishing can only be attached to a package that already exists.
3. In the new package's npm settings, configure **Trusted Publisher** for GitHub Actions:
   repository `kodevza/SunCast`, workflow `publish-npm.yml`, environment omitted.
4. Ensure the intended npm owner has permission to publish the package.

The bootstrap publication requires interactive npm authentication and 2FA; do
not add an npm write token to this repository. Run it only after the release
workflow has been merged:

```bash
npm publish --access public
```

After trusted publishing is configured, every later release uses GitHub Actions
OIDC. Bump `package.json` and `package-lock.json` to the next release version,
then create and push its matching tag:

```bash
git tag v<package-version>
git push origin v<package-version>
```

The workflow rejects a tag that does not exactly match `package.json`'s version,
runs release validation, then executes `npm publish --access public`. npm creates
the provenance attestation automatically for trusted publishing from this public
GitHub repository.

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
