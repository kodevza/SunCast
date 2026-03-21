# UC21 - Automatic PV Panel Layout and Mounting Feasibility

## Status

Proposed

## Goal

Allow the user to enter the desired number of PV panels and basic mounting inputs, then automatically generate a roof layout proposal that is not only geometrically valid, but also **mounting-feasible** with respect to tile spacing and rail support rules.

## User Value

The user should not only see where panels fit on the roof, but also whether they can be mounted in a practical way.

The system should:

* place panels on usable roof areas,
* avoid obstacles,
* prefer lower-shaded areas,
* respect real mounting constraints such as tile spacing and rail support positions.

---

## Core User Story

**As a user**,
I want to enter how many PV panels I want, along with panel dimensions and roof tile spacing,
so that the system can automatically propose a roof layout that is both geometrically valid and realistically mountable.

---

## Expected User Flow

1. User opens the PV mounting feature.
2. User provides:

   * desired panel count,
   * panel dimensions,
   * panel type / mounting-relevant variant,
   * allowed orientation,
   * roof tile spacing,
   * optional mounting margins / clearance rules.
3. User runs auto-layout.
4. System analyzes:

   * roof geometry,
   * obstacles,
   * shading quality,
   * mounting feasibility based on tile spacing and rail support rules.
5. System returns:

   * placed panels,
   * rail-feasible placements,
   * rejected placements,
   * shortfall if requested count cannot fit.

---

## Scope

* Add a dedicated feature for **automatic panel placement with mounting feasibility checks**.
* Use roof geometry, obstacle geometry, and shading suitability.
* Add rail-support validation against panel support zones.
* Add tile spacing as required input for practical mounting alignment.
* Return a deterministic placement result.

---

## Non-Goals

* No electrical string design.
* No inverter sizing.
* No bypass-block shading model.
* No detailed structural roof engineering.
* No wind/snow certification logic.
* No hardware BOM generation in v1.
* No manual drag-and-drop editor in v1.

---

## Feature Boundary

This feature answers:

* where panels can fit,
* whether they can be mounted realistically,
* which roof areas are preferred,
* whether requested count is feasible.

This feature does **not** answer:

* how strings are wired,
* electrical production,
* inverter compatibility,
* exact fastening hardware selection.

---

## Separation of Concerns (SoC) Ownership

### `src/geometry/panel-layout/*`

Owner of pure deterministic placement and mounting-feasibility logic.

Responsibilities:

* candidate panel rectangle generation,
* containment and collision checks,
* obstacle exclusion,
* setback and spacing checks,
* rail position validation,
* tile-spacing alignment checks,
* candidate scoring,
* final layout solving.

No UI code here.

### `src/app/features/pv-mounting/*`

Owner of UI and feature interaction only.

Responsibilities:

* collect user inputs,
* trigger auto-layout,
* render result,
* show warnings and summary.

No placement math or rail validation math here.

### `src/state/project-store/*`

Owner of persisted input settings only, if needed.

Can persist:

* desired panel count,
* panel dimensions,
* panel mounting type,
* allowed orientations,
* tile spacing,
* rail-rule settings,
* setback/clearance preferences.

Must not persist:

* candidate lists,
* solver internals,
* rejected candidate reasons per iteration,
* derived layout scoring internals.

---

## Inputs

### Required

* solved roof geometry,
* obstacle geometry,
* valid roof placement polygons,
* desired panel count,
* panel width,
* panel height,
* allowed placement orientation(s),
* roof tile spacing.

### Optional

* panel mounting type / family,
* edge setback,
* obstacle clearance,
* inter-panel spacing,
* preferred orientation,
* shading suitability input,
* rail-rule override values.

---

## Mounting-Specific Inputs

The feature must ask the user for:

* **panel physical dimensions**
* **panel mounting-relevant type / variant**
* **roof tile spacing**

The feature may also support configurable mounting assumptions such as:

* minimum allowed rail offset from panel edge,
* maximum allowed rail offset from panel edge,
* allowed internal rail span ratio.

---

## Mounting Rules

### Rail support rule

Assume each panel must be supported by rails placed within valid support zones.

For v1, use deterministic rule ranges:

* rail support zone near one panel end: **12% to 25%** of panel length from the edge,
* rail support zone near the opposite end: symmetric equivalent,
* inner distance between rails therefore falls within **50% to 75%** of total panel length.

This should be modeled as an explicit placement rule, not hidden UI logic.

### Tile spacing rule

Rail positions must be compatible with roof tile spacing.

Meaning:

* a placement is valid only if the required rail lines can be aligned to feasible mounting rows implied by tile spacing,
* if rail lines fall outside feasible tile-based mounting positions, reject that candidate.

This can be approximate in v1, but it must be deterministic.

---

## Functional Rules

### 1. Geometry validity

A panel placement is valid only if:

* panel is fully inside valid roof area,
* panel does not intersect any obstacle,
* panel respects roof edge setback,
* panel respects panel-to-panel spacing,
* panel does not overlap another placed panel.

### 2. Mounting feasibility validity

A panel placement is valid only if:

* required rail support positions fall within allowed support zones on the panel,
* rail lines can be mapped to feasible roof tile spacing positions,
* required rail positions are not in impossible mounting locations.

### 3. Placement objective

The solver should prefer layouts that:

1. fit the requested number of panels,
2. are mounting-feasible,
3. avoid obstacles,
4. prefer lower-shaded areas,
5. remain regular and practical.

### 4. Fallback behavior

If the requested panel count cannot be fully placed:

* place the maximum feasible number,
* report the shortfall,
* explain whether the limiting factor was:

  * roof area,
  * obstacles,
  * shading preference,
  * mounting feasibility / tile spacing.

### 5. Determinism

Same inputs must always produce the same result.

---

## Suggested Solver Strategy

A practical v1 is enough.

1. Generate candidate panel rectangles.
2. Filter out candidates that are:

   * outside roof,
   * intersecting obstacles,
   * violating spacing or setback.
3. For remaining candidates, evaluate mounting feasibility:

   * compute required rail lines,
   * check whether rail lines fall into valid panel support zones,
   * check whether rail lines align with feasible tile-spacing positions.
4. Score valid candidates:

   * mounting-feasible first,
   * less shaded is better,
   * cleaner fit is better.
5. Greedily place non-overlapping highest-score candidates until:

   * requested count is reached, or
   * no more valid candidates remain.

That is enough for v1.

---

## Output

The feature should return a deterministic result including:

* placed panel rectangles,
* requested panel count,
* placed panel count,
* unplaced count,
* mounting-feasible status,
* rejected candidate counts by reason,
* summary of limiting factors,
* optional per-panel placement score.

---

## UI Behavior

The UI should allow the user to:

* enter desired panel count,
* enter panel dimensions,
* choose panel mounting type if relevant,
* enter roof tile spacing,
* run auto-layout,
* view final placed panels,
* understand why some placements were rejected.

The UI must not:

* perform rail geometry calculations,
* perform tile-spacing feasibility calculations,
* implement solver scoring formulas.

---

## Validation Rules

Reject run when:

* no valid roof geometry exists,
* desired panel count is `<= 0`,
* panel dimensions are invalid,
* tile spacing is missing or invalid,
* no allowed orientation exists.

Warn when:

* requested count exceeds feasible mounting capacity,
* obstacle density reduces feasible mounting area,
* tile spacing significantly limits layout options,
* shading preference reduces packing efficiency.

---

## Acceptance Criteria

* User can enter target panel count.
* User can enter panel dimensions.
* User can enter roof tile spacing.
* System proposes automatic panel placement.
* Panels are placed only inside valid roof areas.
* Panels do not overlap obstacles.
* Panels do not overlap each other.
* Placements must satisfy rail support rules.
* Placements must satisfy tile-spacing feasibility checks.
* Lower-shaded areas are preferred when feasible.
* When full count cannot fit, system returns the maximum feasible count and explains the limiting reason.
* Placement and mounting logic are isolated from UI.
* Persisted state stores only inputs, never derived solver internals.

---

## Risks

* Tile spacing alone may still be too crude for real mounting accuracy.
* Rail support assumptions may differ between panel manufacturers.
* A layout may be geometrically valid and rule-valid, but still require installer review.
* Greedy placement may miss a better arrangement.

---

## Missing Decisions

Before implementation, these need to be fixed:

1. Is panel orientation fixed or can panels rotate?
2. Are portrait and landscape both supported?
3. Is tile spacing measured vertically only, or in both axes?
4. Are rail rules global defaults or panel-type-specific?
5. Is mounting feasibility a hard reject or a weighted score?
6. Do we model only symmetric two-rail support in v1?

---

## Recommended File Shape

### Pure domain

* `src/geometry/panel-layout/types.ts`
* `src/geometry/panel-layout/generatePanelCandidates.ts`
* `src/geometry/panel-layout/validatePanelGeometry.ts`
* `src/geometry/panel-layout/validateRailSupport.ts`
* `src/geometry/panel-layout/validateTileAlignment.ts`
* `src/geometry/panel-layout/scorePanelCandidates.ts`
* `src/geometry/panel-layout/solvePanelLayout.ts`

### Feature UI

* `src/app/features/pv-mounting/usePvMountingController.ts`
* `src/app/features/pv-mounting/PvMountingPanel.tsx`

### Optional persisted inputs

* `src/state/project-store/projectState.types.ts`
* `src/state/project-store/projectState.reducer.ts`

---

## Final judgment

This is now a better feature than the earlier version, because it stops being a fake geometry-only layout and starts becoming a **mounting-feasibility feature**.

That is the right direction.

The main thing still missing is one hard decision:
**whether tile spacing and rail support are hard constraints or only scoring preferences**.

They should probably be **hard constraints** in v1, otherwise the result will look smart but be useless.

If you want, I can now turn this into a stricter **implementation-ready story with exact input/output TypeScript contracts**.
