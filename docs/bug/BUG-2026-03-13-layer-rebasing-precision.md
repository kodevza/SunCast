# BUG-2026-03-13-LAYER-REBASING-PRECISION

- Status: resolved
- Area: rendering (`src/rendering/roof-layer/*`, `src/rendering/shared/*`, `src/app/features/map-editor/MapObjects/*`)
- Reported impact: thin or small 3D roof/obstacle/heatmap geometry could jitter, flicker, or disappear.

### What Was Investigated

1. Rendering path for roof/obstacle meshes:
   - `src/app/features/map-editor/MapObjects/layers/MapObjectMeshLayer.ts`
2. Rendering path for heatmap custom layer:
   - `src/rendering/roof-layer/RoofHeatmapLayer.ts`
3. Geometry adapter/world conversion behavior:
   - `src/rendering/shared/layerGeometryAdapters.ts`
   - `src/rendering/shared/meshWorldGeometry.ts`
4. Numeric precision behavior with float32:
   - `src/rendering/shared/layerRebasing.test.ts`

### How Resolution Was Found

1. The team validated that coordinates were assembled near large Mercator world anchors, then stored in float32 GPU buffers.
2. A focused precision test reproduced the failure mode by comparing:
   - legacy path: `anchor +/- tiny_delta` before float32 conversion
   - rebased path: `+/- tiny_delta` in layer-local space before float32 conversion
3. Evidence from `src/rendering/shared/layerRebasing.test.ts`:
   - legacy span collapsed to zero (`legacySpan === 0`)
   - rebased span stayed positive (`rebasedSpan > 0`)
4. Based on this evidence, the fix was confirmed as a layer-relative rebasing strategy:
   - keep per-vertex coordinates near zero
   - apply a single layer anchor translation via camera projection matrix

### Root Cause

Float32 precision loss when combining small meter-scale deltas with large Mercator anchor coordinates in vertex data.

### Resolution Implemented

1. Added layer anchor resolution and local-coordinate conversion:
   - `src/rendering/shared/layerRebasing.ts`
2. Applied rebasing in mesh layer generation/render:
   - `src/app/features/map-editor/MapObjects/layers/MapObjectMeshLayer.ts`
3. Applied equivalent anchor translation handling in heatmap layer:
   - `src/rendering/roof-layer/RoofHeatmapLayer.ts`
4. Added explicit precision regression test:
   - `src/rendering/shared/layerRebasing.test.ts`

### Regression Guard

- Keep `src/rendering/shared/layerRebasing.test.ts` passing in CI.
- Any change to world/layer coordinate composition must preserve:
  - layer-local vertex magnitudes near zero
  - camera-side anchor translation
  - non-zero span for 1m-scale geometry in float32 precision tests
