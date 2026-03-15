# Formal Review — Test Suite Usefulness and Required Corrections

## Executive Summary

The test suite is green, but it does **not** provide strong evidence that the business logic is correct.

Current test quality is **not acceptable** for a geometry-first, simulation-heavy product.

Main problem:

* too many tests verify **wiring**
* too few tests verify **business truth**
* too many tests use mocks exactly where real computation should be checked
* E2E covers flows and visibility, but usually does **not** prove that computed results are correct

This creates **false confidence**.

---

## Main Findings

### 1. Core business logic is over-mocked

This is the biggest issue.

Examples:

* `src/app/hooks/useRoofShading.test.tsx`

  * mocks `computeRoofShadeGrid`
* `src/app/hooks/useAnnualRoofSimulation.test.tsx`

  * mocks `prepareShadingScene`
  * mocks `computeAnnualSunAccessBatched`
* `src/app/hooks/useSunCastController.test.tsx`

  * mocks almost all lower layers

This means those tests do **not** prove that shading or annual simulation works.
They only prove that a hook can call a mocked function.

That is low-value testing.

---

### 2. E2E tests mostly validate interaction, not correctness

Examples:

* `e2e/roof-orbit.spec.ts`
* `e2e/uc-strategy.spec.ts`

These tests check things like:

* button visibility
* input filling
* toggles
* screenshots
* URL hash updates
* localStorage / page flow

This is useful only as smoke coverage.

It is **not enough** for a product where the core promise is:

* roof solving
* shading correctness
* annual sun access correctness
* deterministic geometry outputs

Right now, E2E proves the app moves.
It does not sufficiently prove the app computes the right answer.

---

### 3. Some domain tests are good, but too soft

Example:

* `src/geometry/shading/annualSunAccess.test.ts`

There are some good intentions here.
However, many assertions are too weak, for example:

* `> 0`
* `< 0.5`
* “close to full-year”
* “less than full year”

These checks are too forgiving.

A broken algorithm can still pass them.

For business-critical simulation code, expected results must be much tighter and scenario-based.

---

### 4. UI test value is overstated

Example:

* `src/app/features/sun-tools/AnnualSunAccessPanel.test.tsx`

This test mainly proves:

* a canvas exists
* `getContext('2d')` was called
* canvas width/height is non-zero

This does **not** verify that the user sees correct annual metrics.
It is a shallow rendering test.

---

### 5. Test strategy document says the right thing, but implementation does not fully match it

Example:

* `docs/TEST_STRATEGY.md`

The document says:

* geometry should remain deterministic
* E2E should verify geometry outputs
* unit tests should cover numeric edge cases

That direction is correct.

But current implementation does not fully follow it.
The repository still contains too many tests that are decorative rather than protective.

---

### 6. The repository already knows one correctness bug existed

Example:

* `docs/bug/BUG-2026-03-13-sun-behind-plane-counted-as-sun-access.md`

This is important.

It proves that the system can look “fine” while core solar logic is wrong.

That is exactly why weak test assertions are dangerous here.

---

## Required Changes

Below is the concrete plan.
This should be treated as mandatory work, not optional cleanup.

---

## A. Rewrite tests that currently mock the business engine

### A1. `src/app/hooks/useRoofShading.test.tsx`

### Problem

The test mocks `computeRoofShadeGrid`, which is the core computation.

### Required change

Replace the current correctness-oriented tests with tests that use the **real** shading engine.

### Keep only:

* one small orchestration test for throttling behavior
* one small caching behavior test if needed

### Add real-computation tests:

* unobstructed roof returns fully lit cells in known sun position
* obstacle reduces lit cells in known sun position
* sun behind plane returns zero direct-sun lit cells
* identical inputs return stable output
* changing obstacle geometry changes output

### Rule

Do **not** mock `computeRoofShadeGrid` in correctness tests.

---

### A2. `src/app/hooks/useAnnualRoofSimulation.test.tsx`

### Problem

The test mocks both scene preparation and annual computation.

### Required change

Split this file into two kinds of tests:

#### Keep one small orchestration test

Allowed to mock:

* progress callback
* async yielding behavior

#### Add real-computation correctness tests

Use real:

* `prepareShadingScene`
* `computeAnnualSunAccessBatched`

### Must verify:

* expected `sunHours`
* expected `frontSideHours`
* expected `sunAccessRatio`
* expected heatmap cell count
* deterministic result for same input
* changed cache revision actually invalidates cache
* invalid date range fails fast

### Rule

Do **not** mock the annual simulation engine when testing simulation correctness.

---

### A3. `src/app/hooks/useSunCastController.test.tsx`

### Problem

This file mocks almost the entire app.
It mostly proves that composition wiring exists.

### Required change

Reduce this file to a **minimal smoke test** or remove most of it.

### Keep only:

* one test that verifies controller returns composed models without crashing

### Remove:

* large mocked interaction scenarios that do not verify domain truth

### Reason

This file is too far from the business value.
It consumes maintenance cost without giving strong protection.

---

## B. Strengthen domain tests with hard expected values

### B1. `src/geometry/shading/annualSunAccess.test.ts`

### Problem

Assertions are too broad.

### Required change

Introduce fixed reference scenarios with tighter expected outputs.

### Add reference scenes:

1. flat unobstructed roof
2. flat roof with full blocking obstacle
3. partially shaded roof
4. steep roof facing away from sun
5. same scene with half-year mirror vs full-year
6. explicit date-range simulation
7. low-sun threshold exclusion
8. very small roof / coarse-vs-fine sampling edge case

### For each scenario assert:

* `sunHours`
* `frontSideHours`
* `sunAccessRatio`
* number of heatmap cells
* selected cell `litRatio` values
* deterministic meta output

### Replace weak assertions like:

* `> 0`
* `< 0.5`

with stronger expectations based on known scenario results and tolerances.

---

### B2. `src/geometry/shading/computeShadeSnapshot.test.ts`

### Status

This is one of the better tests.

### Required change

Use it as the model for other correctness tests.

### Add more cases:

* partial occlusion
* no obstacles
* low-sun threshold edge
* obstacle outside shadow path should not affect result

---

## C. Fix shallow UI tests

### C1. `src/app/features/sun-tools/AnnualSunAccessPanel.test.tsx`

### Problem

The test checks rendering mechanics, not business presentation.

### Required change

Assert what the user actually depends on.

### Add checks for:

* displayed `sunHours`
* displayed `sunAccessRatio`
* displayed date range
* visible state transitions (`IDLE`, `RUNNING`, `READY`, `ERROR`)
* annual heatmap toggle behavior
* error message visibility
* progress display

### Remove emphasis on:

* only checking canvas existence
* only checking `getContext`

---

## D. Upgrade E2E from smoke to business validation

### D1. `e2e/roof-orbit.spec.ts`

### Problem

Mostly interaction and screenshots.

### Required change

Keep interaction flow, but add correctness assertions.

### Add assertions for:

* after setting known roof heights, derived pitch/azimuth values are shown and stable
* enabling shading at a known datetime produces expected status and expected metrics
* mesh toggle changes visualization state, but also does not corrupt computed values

---

### D2. `e2e/uc-strategy.spec.ts`

### Problem

Large flow coverage, weak business verification.

### Required change

For at least a few core user cases, assert deterministic business outcomes.

### Must add:

* reload preserves canonical state and reproduces same derived outputs
* same project loaded twice produces identical pitch/azimuth/shading values
* share/load roundtrip preserves input truth and recomputed output truth
* annual simulation for known scenario shows expected numbers, not just visible UI

---

## E. Introduce a strict testing rule

This must be written into the repo and followed.

### New rule

**Do not mock the module whose output is the business decision under test.**

### Allowed to mock:

* analytics
* timers
* browser APIs
* clipboard
* network providers
* storage failures
* progress callbacks

### Not allowed to mock in correctness tests:

* `computeRoofShadeGrid`
* `prepareShadingScene`
* `computeAnnualSunAccess`
* `computeAnnualSunAccessBatched`
* solver logic
* roof geometry generation when geometry result is what the test claims to validate

---

## F. Create deterministic reference fixtures

Add a small fixture set for repeatable simulation tests.

### Required fixture pack

Create canonical test scenes for:

* `flat_unobstructed`
* `flat_fully_blocked`
* `flat_partially_blocked`
* `north_facing_winter`
* `small_roof_precision_case`
* `date_range_june_case`

Each fixture should define:

* roof polygon
* vertex heights
* obstacles
* simulation options
* expected results

This removes guesswork and stops future “interpretation”.

---

## G. Coverage must stop being treated as proof

### Problem

Coverage is currently too easy to inflate with low-value tests.

### Required change

Coverage may remain a secondary signal, but correctness acceptance must depend on:

* deterministic reference scenarios passing
* E2E numeric assertions passing
* roundtrip persistence determinism passing

### Do not accept:

“coverage is high” as proof that business logic works.

It is not proof.

---

## Priority Order

### Priority 1 — Do first

1. Rewrite `useRoofShading.test.tsx`
2. Rewrite `useAnnualRoofSimulation.test.tsx`
3. Strengthen `annualSunAccess.test.ts`
4. Add deterministic reference fixtures

### Priority 2

5. Reduce `useSunCastController.test.tsx`
6. Fix `AnnualSunAccessPanel.test.tsx`
7. Upgrade E2E with numeric assertions

### Priority 3

8. Update `docs/TEST_STRATEGY.md` so it matches the new rules
9. Add explicit “no business-engine mocks” rule to vendor guardrails

---

## Acceptance Criteria

This review is closed only when all of the following are true:

1. Hook correctness tests no longer mock the main shading/simulation engine.
2. Annual simulation tests use fixed reference scenes with hard expected outputs.
3. E2E includes numeric business assertions, not only UI flow checks.
4. Controller smoke tests are reduced and no longer pretend to be deep validation.
5. Panel tests validate user-facing metrics and states.
6. Same input produces same derived output after reload/share roundtrip.
7. Coverage is no longer used as the main argument for correctness.

---

## Final Judgment

The current suite is not useless, but it is **misweighted**.

It provides some smoke protection.
It does **not** provide enough business correctness protection.

The vendor must stop testing that the app “does something” and start testing that the app computes the **right thing**.

If you want, I can turn this into an even harsher vendor action list with titles like **“Must Fix / Should Fix / Remove”** and no soft language at all.
