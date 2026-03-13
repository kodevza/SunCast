# Tech Debt Register

## Status

The sanitize/fallback items listed in this register were removed in favor of fail-fast validation and explicit error reporting.

Current behavior for processing failures:
- fail closed instead of silently sanitizing input
- no stale-cache/main-thread fallback for listed flows
- emit app errors with `enableStateReset: true` where state recovery is required
- surface recovery through global toast action `global-error-toast-reset-state`

## Implemented Changes

| Area | Previous behavior | Current behavior |
|---|---|---|
| Project state load/mappers/constraints/reducer | sanitize + clamping + selection fallback | strict validation, throw/reject invalid payloads, no auto-active fallback |
| Tutorial storage | sanitize corrupt localStorage payload | strict parse/validation, report `STORAGE_CORRUPTED` with reset-state enabled |
| Roof mesh generation | sanitize/dedupe/filter triangles | strict geometry validation, fail on invalid/degenerate triangulation |
| Heatmap worker path | worker failure -> sync fallback | worker failure stops heatmap processing and reports error |
| Runtime boundary | fallback UI inside boundary | boundary reports runtime error; global toasts remain mounted |
| Place search | stale cache fallback on provider failure | hard failure with reported error |
| Forecast fetch | stale cache fallback after retries | hard failure after retries |
| Constraint editor | auto third-vertex fallback for edge constraint | no automatic fallback vertex constraint |
