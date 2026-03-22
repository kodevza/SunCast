# Features

## Implemented (Stage 1)

- Satellite map editor with footprint drawing.
- Vertex and edge height constraints.
- Planar roof solve, mesh generation, pitch/azimuth metrics.
- Multi-footprint selection and aggregation.
- Obstacle drawing/editing with height/type inputs.
- Orbit/3D map view with roof/obstacle mesh overlay.
- Basemap switch (`Satellite` / `Streets`) via visibility toggle in a single style.
- Visible attribution control (OSM fixed wording; Esri + dynamic provider metadata).
- Draw workflow hints and keyboard shortcuts (`Backspace`/`Ctrl|Cmd+Z` undo, `Enter` finish).
- Sun projection and daily/annual production charts.
- Live roof-shading preview + annual sun-access simulation.
- Weather-forecast daily estimate (Open-Meteo).
- Address/place search (Photon).
- Shareable project payload in URL.
- Tutorial overlay and guided onboarding.

## Planned Next (P1)

- Per-footprint solve caching.
- Stronger provider resilience policy (retry/cache/backoff tuning per integration).
- Expanded observability and telemetry surfaces.
- Stronger schema migration/version enforcement.

## Out Of Scope (Current Stage)

- Multi-face roof solver.
- Terrain elevation correction.
- BIM/CAD export.
- Structural modeling.
- Multi-user backend collaboration.
