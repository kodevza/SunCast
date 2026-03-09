# Decisions

## D1. Geometry Is Authoritative

- Status: accepted
- Decision: persist footprints and constraints; regenerate meshes/metrics.
- Why: deterministic behavior and reproducible project reloads.

## D2. Solver Runs In Local Meters

- Status: accepted
- Decision: project lon/lat to local metric coordinates before solving.
- Why: geometric operations in geographic coordinates are unstable and not dimension-accurate.

## D3. Reducer-Centric Project State

- Status: accepted
- Decision: use command-oriented reducer/store for footprint mutations and persistence.
- Why: explicit transitions and easier regression testing.

## D4. App-Level Degraded Runtime Handling

- Status: accepted
- Decision: global error boundary plus feature-level fallback messaging.
- Why: vendor operations need graceful failure, not blank app crashes.

## D5. CI Gate Before Deploy

- Status: accepted
- Decision: deploy workflow runs only after successful CI on `main`.
- Why: prevent shipping unvalidated builds.
