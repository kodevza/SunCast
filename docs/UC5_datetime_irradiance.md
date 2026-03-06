## UC5 update — user-set datetime + status irradiance (W/m²)


1. User **must** set a concrete `datetime` (no “now” default in this UC).
2. App shows **instantaneous plane irradiance** in **W/m²** for the roof plane at that datetime.
3. Since weather/clouds are out of scope, irradiance is **clear-sky estimate** (must be labeled “clear-sky”). If later you plug forecast API, same UI field can switch to “forecast”.

---

### Inputs 

#### Required

* `datetime` (ISO; user-selected; includes timezone)
* `location` (lat/lon)
* `roofPlane` + `roofOrientation` (pitch + azimuth) 

#### Optional (future-ready, not required now)

* `atmosphere`:

  * `pressure_hPa`, `temp_C`, `aod`, `pwv` (if you later want better clear-sky)
* `weatherIrradiance`:

  * `dni`, `dhi`, `ghi` (if later from API)

---

### Outputs 

#### Solar geometry (as before)

* `sunAzimuthDeg`, `sunElevationDeg`
* `incidenceDeg`, `cosIncidence = max(0, dot(nRoof, -sunDir))`

#### Irradiance 

* `poaIrradiance_Wm2` (Plane Of Array, on the roof plane)
* `components` (optional for debug/HUD):

  * `poaDirect_Wm2`
  * `poaDiffuse_Wm2`
  * `poaGroundReflected_Wm2` (can be 0 for MVP)

**MVP formula (clear-sky, simple + deterministic):**

* compute clear-sky `DNI_clear`, `DHI_clear` (minimal model; deterministic)
* `poaDirect = DNI_clear * cosIncidence`
* `poaDiffuse = DHI_clear * (1 + cosTilt)/2` (isotropic sky)
* `poa = poaDirect + poaDiffuse`
  If `sunElevationDeg <= 0` ⇒ `poa = 0`.

(If you already have `GHI/DNI/DHI` from an API later: same POA calculation, just replace the clear-sky inputs.)

---

### UI behavior (updated)

1. “Sun projection” toggle remains (only when roof plane is solved). 
2. Add mandatory control: **Datetime picker** (date + time + timezone).

   * If datetime not set ⇒ overlay disabled and status says “Set datetime”.
3. Status/HUD shows:

   * `POA (clear-sky): XXX W/m²`
   * `Sun: az=…, el=…`
   * `Incidence: …°`
   * when `sunElevationDeg <= 0`: `POA: 0 W/m² (sun below horizon)`

---

### Acceptance criteria (added)

1. Without datetime set:

   * no W/m² shown; UI prompts to set datetime.
2. With datetime set:

   * status always shows `POA (clear-sky)` in W/m².
3. Night case:

   * POA must be exactly `0 W/m²`.
4. Changing roof pitch/azimuth updates POA immediately (same datetime).

---

### Implementation notes (minimal)

* `src/geometry/sun/clearSky.ts`

  * deterministic clear-sky irradiance provider (MVP)
* `src/geometry/sun/poaIrradiance.ts`

  * `computePOA({dni, dhi, tiltDeg, incidenceDeg}) -> W/m²`
* `SunProjectionStatus.tsx`

  * renders `POA` + geometry lines

---

### Tests (added)

* Unit:

  * night datetime ⇒ POA = 0
  * incidence 90° ⇒ `poaDirect ≈ 0`
  * pitch change affects POA monotonic for fixed sun position
* Playwright:

  * set datetime ⇒ POA text appears
  * change datetime ⇒ POA text changes 

Your best advisor Jacuś.
