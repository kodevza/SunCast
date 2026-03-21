# UC20 - String Inverter Bypass-Block Shading Model (App/Analysis Owned)

## Status
Proposed

## Goal
Add a practical PV shading-loss model for standard string inverter systems (no microinverters, no optimizers), where electrical shading impact is computed at bypass-diode block level and aggregated to module and string power.

## Why This UC
Current geometric shading outputs (lit/shaded ratio) are valuable for sun-access maps, but production estimation under hard local shading (chimney/tree/antenna) needs an electrical aggregation model. The minimum model that captures real nonlinear behavior is bypass-block level, not whole-module area loss.

## Scope
- Add deterministic analysis pipeline for bypass-block electrical losses.
- Support 5-minute timestep simulation.
- Keep canonical state unchanged (geometry + explicit settings only).
- Keep solver and shading geometry logic out of UI.
- Expose derived outputs for charts/panels in `sun-tools`.

## Non-Goals
- No IV-curve solver with temperature-dependent MPP tracing.
- No microinverter/optimizer behavior.
- No persistence of per-timestep simulation outputs.
- No geometry algorithm implementation in `app/features/*` UI components.

## Separation Of Concerns (SoC) Ownership
- `src/geometry/shading/*`:
  - pure deterministic shading scene/snapshot inputs (already existing).
  - source of `q_b(t)` inputs (block shaded fraction per timestep) derived from geometry.
- `src/app/analysis/*`:
  - owner of bypass-block electrical model orchestration and aggregation.
  - owner of run lifecycle, caching, progress, and derived results exposed to UI.
- `src/app/features/sun-tools/*`:
  - UI controls and result presentation only.
  - no shading math or electrical aggregation math.
- `src/state/project-store/*`:
  - optional storage of user-configurable simulation settings only (if enabled in this UC iteration).
  - never stores derived simulation timeseries/results.

## Input Contract
For each string:
- module count in string.
- module layout/order in series.
- bypass block count per module (`N_blocks`):
  - default `3` (standard module),
  - optional `6` (half-cut) when known.

For each timestep `t` and each module block `b`:
- shaded fraction `q_b(t)` in `[0, 1]`.
- irradiance split:
  - direct `B(t)`,
  - diffuse `D(t)`,
  - global `G(t) = B(t) + D(t)`.

## Model Definition (Required Equations)
### 1. Effective block irradiance
For small hard local shadows:

`G_b_eff(t) = B(t) * (1 - q_b(t)) + D(t)`

### 2. Block relative current capability

`i_b(t) = G_b_eff(t) / G(t)`

### 3. Bypass activation decision
- `q_crit = 0.4` default (allowed range `0.35 - 0.45`).
- if `q_b(t) < q_crit` then `a_b(t) = 1` (block active).
- if `q_b(t) >= q_crit` then `a_b(t) = 0` (bypassed).

### 4. Module relative current
Use active blocks only:

`I_mod_rel(t) = min(i_b(t) for active blocks)`

Edge rule: if all blocks bypassed, `I_mod_rel(t) = 0`.

### 5. Module relative voltage

`V_mod_rel(t) = (sum(a_b(t))) / N_blocks`

### 6. Module relative power

`P_mod_rel(t) = I_mod_rel(t) * V_mod_rel(t)`

### 7. String aggregation (series string inverter)
- `I_str_rel(t) = min(I_mod_rel,m(t))` across modules in string.
- `V_str_rel(t) = (sum(V_mod_rel,m(t))) / N_modules`.
- `P_str_rel(t) = I_str_rel(t) * V_str_rel(t)`.

### 8. Energy
- timestep `delta_t = 5 min` mandatory default.
- with nominal DC power `P_nom`:

`P_str(t) = P_nom * P_str_rel(t) * f_temp(t)` (optional `f_temp`).

First version may use `f_temp(t) = 1`.

`E = sum(P_str(t) * delta_t)`

## Implementation Map (Exact Files)
### A. Geometry/domain inputs reused (no UI coupling)
- `src/geometry/shading/prepareShadingScene.ts`
- `src/geometry/shading/computeShadeSnapshot.ts`
- `src/geometry/shading/annualSunAccess.ts`
- `src/geometry/shading/types.ts`

These provide deterministic geometric shading context. This UC does not move electrical math into geometry modules.

### B. New analysis-domain electrical model (primary ownership)
Add new pure analysis module(s):
- `src/app/analysis/pvStringElectricalModel.ts`
- `src/app/analysis/pvStringElectricalModel.test.ts`

Responsibilities:
- implement equations from this UC.
- map timestep inputs (`q_b`, `B`, `D`) to module/string relative power.
- provide deterministic per-step and aggregated energy outputs.

Suggested exported contracts:
- `computeModuleRelativePower(...)`
- `computeStringRelativePower(...)`
- `computeStringEnergySeries(...)`

### C. Analysis orchestration hook (app/analysis boundary)
Extend or add hook:
- preferred extension: `src/app/analysis/useAnnualRoofSimulation.ts`
- optional dedicated hook: `src/app/analysis/useStringElectricalSimulation.ts`

Responsibilities:
- run 5-minute timeline batches.
- reuse existing run-state pattern (`IDLE | RUNNING | READY | ERROR`).
- cache by deterministic key including geometry fingerprint + electrical config.
- expose typed derived results for UI.

### D. Type contracts
Update:
- `src/app/analysis/analysis.types.ts`

Add:
- block/module/string result types.
- options (`qCrit`, `blocksPerModule`, timestep, optional temp factor usage).

### E. UI wiring only (no math)
Integrate in:
- `src/app/features/sun-tools/useAnnualSunAccessController.ts`
- `src/app/features/sun-tools/AnnualSunAccessPanel.tsx`
- `src/app/features/sun-tools/SunOverlayColumn.tsx`

Responsibilities:
- gather user settings.
- trigger analysis hook.
- show results (`sun hours`, `ratio`, `string relative energy`, optional `kWh`).

### F. Optional persistence (settings only)
If simulation settings are persisted:
- `src/state/project-store/projectState.types.ts`
- `src/state/project-store/projectState.reducer.ts`
- storage/share sanitize/migration files in `src/state/project-store/*`

Do not persist outputs/timeseries.

## Defaults
- timestep: `5` minutes.
- `N_blocks`: `3` if unknown.
- `q_crit`: `0.4`.
- diffuse unchanged for local small obstacles.
- no temperature correction in v1 unless user enables it.

## Validation And Rejection Rules
Reject run when:
- no solved roofs/string mapping input.
- invalid timestep (`<= 0`).
- invalid `q_crit` (outside `(0, 1)`).
- missing paired date range values.

Warn when:
- over-constrained or fallback solve already reported by geometry layer.
- all blocks bypassed for sustained periods (possible unrealistic configuration input).

## Test Plan
### Unit tests (required)
- `src/app/analysis/pvStringElectricalModel.test.ts`
  - block shading transitions around `q_crit`.
  - module voltage step-down with bypass count.
  - weakest-module current limiting at string level.
  - energy integration correctness for 5-minute steps.

### Boundary tests
- update `src/app/analysis/useAnalysis.boundary.test.ts`
  - verify new electrical model remains in `app/analysis` and not in UI modules.

### Hook tests
- extend `src/app/analysis/useAnnualRoofSimulation.test.tsx` (or new hook test)
  - manual trigger lifecycle.
  - cache reuse/invalidation.
  - clear/reset behavior.

## Acceptance Criteria
- Model uses bypass-block logic, not whole-module `% shaded` scaling.
- Simulation runs at 5-minute resolution by default.
- String current limiting and bypass-voltage drop are represented.
- All electrical math implemented in `src/app/analysis/*` (SoC respected).
- UI only controls/visualizes derived results.
- Canonical storage persists only input settings (if enabled), never outputs.
- Deterministic tests added proportionally to risk.

## Risks
- Mapping geometric shade cells to module bypass blocks can introduce approximation error if module/block layout metadata is incomplete.
- High-resolution long ranges increase compute time; batching/yielding must remain enabled.
- Mixing annual sun-access metrics and electrical yield metrics in one panel can confuse users without clear labeling.

## Rollout Notes
- Phase 1: add pure electrical model + unit tests.
- Phase 2: wire orchestration hook and panel outputs.
- Phase 3: optional persistence of settings, with schema-safe migration.
- Phase 4: calibrate `q_crit` and defaults against field samples (if available).
