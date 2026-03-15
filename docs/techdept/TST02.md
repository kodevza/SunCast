Below is the corrected formal refactor plan.

It now does two things that were missing:

1. it states **exactly what should be removed or merged**
2. it includes **address search at the beginning of the main flow** by searching for **“Warsaw”** and navigating to that location before drawing

---

# E2E / Playwright Test Suite Refactor Plan

## Objective

Refactor the current Playwright / E2E suite into a **small, high-signal test set** with **no more than 4 tests**.

The current suite is too fragmented. It repeats the same setup across many scenarios and uses browser-level tests for behavior that does not justify full E2E cost. The target is to keep only the flows that protect real product risk and remove or merge the rest.

---

# Target Suite After Refactor

The final suite should contain exactly these 4 tests:

1. **Search and critical editor flow**
2. **Persistence and multi-footprint behavior**
3. **Drawing regressions**
4. **Annual shading simulation**

---

# Test 1 — Search and Critical Editor Flow

## Purpose

Validate the main user journey in one consolidated test.

## Required flow

This test should start with address search:

* Open the application
* Use the search input
* Type **“Warsaw”**
* Select the result and navigate to that location
* Draw a **roof**
* Draw an **obstacle**
* Verify that **edge lengths are calculated correctly during drawing**
* Verify invalid state before completion
* Verify valid state before completion
* Finish drawing successfully
* Apply/edit geometry constraints where relevant
* Verify pitch / geometry response
* Enter orbit mode
* Verify sun/date change produces visible computational change
* Verify essential mesh/visibility behavior if still required

## Why this test exists

This is the single most important browser test. It covers the real user flow from location search to modeling and inspection.

## Acceptance criteria

* Search for “Warsaw” works and moves the map to the selected location
* Roof and obstacle are created successfully
* Edge measurements update correctly during drawing
* The editor moves correctly from incomplete to valid state
* Orbit mode works
* Sun/date interaction changes the output in a meaningful way

---

# Test 2 — Persistence and Multi-Footprint Behavior

## Purpose

Verify that user work survives realistic state transitions.

## Required flow

* Create footprint A
* Apply relevant modifications
* Create footprint B
* Switch active footprint
* Reload the page
* Verify state restoration
* Delete an active footprint
* Verify UI and persisted state remain consistent

## Acceptance criteria

* Footprints persist correctly across reload
* Active footprint is restored correctly
* Deletion updates the application state correctly

---

# Test 3 — Drawing Regressions

## Purpose

Protect against fragile drawing behavior that has already shown regression risk.

## Required coverage

* Drawing completion must not depend on map/network idle timing
* Edge length input must apply only on the intended commit action
* Any previously observed unstable drawing behavior should be covered here, not scattered across unrelated tests

## Acceptance criteria

* Drawing completion is deterministic
* Input commit behavior is explicit and stable
* No timing-based accidental success/failure remains

---

# Test 4 — Annual Shading Simulation

## Purpose

Validate the highest-value computational output at user level.

## Required flow

* Create a valid roof
* Add at least one obstacle
* Run the annual shading simulation
* Verify that a **matrix / heatmap-style result** is generated
* Verify that different roof areas show different shading values
* Verify that obstacle geometry materially affects the output

## Acceptance criteria

* Simulation starts and completes successfully
* A shading matrix/heatmap is rendered
* Output is spatially varied, not flat or uniform
* Obstacle presence changes the result in a visible way

---

# What Must Be Removed or Merged

This section is mandatory. The refactor is not complete unless the old scattered scenarios are removed.

## Merge into Test 1 — Search and Critical Editor Flow

The following standalone tests should no longer exist as separate E2E tests:

* `UC15: address search`
  **Action:** remove as standalone test and merge into the beginning of Test 1

* `UC0`
  **Action:** merge into Test 1

* `UC2 + UC0.1`
  **Action:** merge into Test 1

* `UC1 + UC4 + IP1`
  **Action:** merge into Test 1

* `UC5`
  **Action:** merge into Test 1

* `UC5 + orbit sun perspective`
  **Action:** merge into Test 1

* `UC6`
  **Action:** merge into Test 1 only if it still represents essential product behavior; otherwise remove

* standalone `roof-orbit.spec.ts` happy path coverage
  **Action:** remove as separate spec and merge into Test 1

## Keep only in Test 2 — Persistence and Multi-Footprint

* `UC3 + determinism`
  **Action:** keep the business intent, but move it into Test 2 and remove the old standalone fragmented version

## Keep only in Test 3 — Drawing Regressions

* `draw finish should not depend on map network becoming idle`
  **Action:** keep, but only inside Test 3

* `draw edge length applies only after Enter from keyboard input`
  **Action:** keep, but only inside Test 3

These should not remain as separate tiny product tests outside the regression bucket.

## Remove or downgrade

* `UC12: tutorial`
  **Action:** remove from main E2E suite
  If tutorial coverage is still required, replace it with one very small smoke test or move most of it to integration/component level.

* any screenshot-only tests or steps that attach screenshots without strict assertions
  **Action:** remove

* UI-only toggle checks that do not validate business effect
  **Action:** remove or downgrade to lower test level

* isolated tests that only verify panel visibility, label changes, or cosmetic UI reactions
  **Action:** remove from E2E

---

# Removal Rules

Students must not simply add 4 new tests on top of the old suite.
They must **delete or merge** the old tests.

The final result must satisfy both conditions:

1. the new 4-test structure exists
2. the old duplicated scenario tests are gone

If an old test covers behavior already absorbed by one of the 4 target tests, that old test must be removed.

---

# Required Refactor Work

## 1. Inventory current tests

Create a list of all existing Playwright/E2E tests and map each one to one of these outcomes:

* merge into Test 1
* merge into Test 2
* merge into Test 3
* merge into Test 4
* remove
* downgrade to integration/component test

## 2. Extract shared helpers

Create reusable helpers for repeated setup logic, for example:

* `openApp()`
* `searchLocation("Warsaw")`
* `drawRoof()`
* `drawObstacle()`
* `finishDrawing()`
* `setEdgeConstraint()`
* `enterOrbitMode()`
* `runAnnualSimulation()`

## 3. Replace repeated low-level steps

No repeated manual setup should remain inside multiple specs if it can be expressed once in helpers.

## 4. Replace weak assertions

Assertions must verify business outcomes:

* location changed
* geometry accepted
* state restored
* simulation output generated
* matrix spatial variation exists

Weak UI-only assertions must be removed.

---

# Final Expected Structure

```text
e2e/
  search-critical-editor-flow.spec.ts
  persistence-multi-footprint.spec.ts
  drawing-regressions.spec.ts
  annual-shading-simulation.spec.ts

e2e/helpers/
  app-helpers.ts
  drawing-helpers.ts
  editor-helpers.ts
  simulation-helpers.ts
```

---

# Definition of Done

This refactor is complete only when:

* the suite contains **no more than 4 Playwright tests**
* address search is included at the beginning of the main flow using **“Warsaw”**
* roof and obstacle drawing are both covered in the main flow
* edge measurement during drawing is explicitly checked
* annual shading simulation has one dedicated test
* all duplicated old scenario tests have been removed or merged
* tutorial/UI-only/browser-expensive low-value tests have been downgraded or deleted
* strong behavioral assertions replaced weak UI-only checks

---


You are not asked to “add a few more tests.”
You are asked to **compress and rebuild the suite**.

The correct outcome is:

* fewer tests
* stronger coverage
* less duplication
* clearer failure reasons
* removal of the old fragmented scenarios

If the old tests remain in place, the refactor has failed.

