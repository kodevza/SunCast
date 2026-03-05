# Agents Guide (AI + human contributors)

This repository builds a **React application for placing dimension-accurate 3D objects and roof planes on a satellite map**.

The system allows users to:
- draw a **2D footprint**
- assign **heights to vertices or edges**
- generate **planar 3D roof surfaces**
- measure pitch, azimuth, and roof geometry

> **Golden rule:** the **source of truth is geometry + constraints**, never generated meshes.

---

# Quick workflow (what to do first)

1. **Understand geometry model**
   - Footprint polygon
   - Vertex/edge height constraints
   - Plane solver → roof mesh

2. **Implement solver logic first**
   - Convert coordinates → meters
   - Fit plane from constraints
   - Generate 3D vertices

3. **Integrate with map**
   - Display satellite tiles
   - Draw footprints
   - Select vertex / edge

4. **Render 3D roof**
   - Build mesh from solved plane
   - Render overlay on map

5. **Persist project**
   - Save footprint + constraints
   - Regenerate geometry deterministically

---

# Repository map (authoritative)

```text
root/
  docs/
  src/
    app/
      components/
        MapView/            # MapLibre integration
        DrawTools/          # footprint drawing + editing
        RoofEditor/         # vertex/edge height editing
      screens/
        EditorScreen.tsx    # main application UI
    geometry/
      solver/               # plane fitting + constraints
      mesh/                 # roof mesh generation
      projection/           # lon/lat → meters conversion
    rendering/
      roof-layer/           # 3D roof mesh overlay
    state/
      project-store/        # project state + persistence
    types/
      geometry.ts           # domain geometry types
  public/
  config/
```

---

# Architecture principles

## Geometry-first system

Everything derives from:

```
footprint polygon
+ height constraints
-------------------
roof planes
+ meshes
```

Meshes are **derived artifacts** and must never become the source of truth.

---

## Coordinate system

All geometry calculations must run in **meters**.

Workflow:

```
lon/lat
→ local planar coordinates (meters)
→ geometry solving
→ mesh generation
→ rendered back on map
```

Never run geometric solvers directly in lon/lat.

---

## Roof modeling model

Any roof is treated as **one or more planar faces**.

Planes are solved from **user constraints**.

Constraints may include:

```
vertex height
edge height
```

Minimum requirement for a plane:

* **3 non-collinear constrained points**

---

# Coding rules

## Geometry engine

* Must be **pure functions**
* No UI dependencies
* Deterministic outputs

Example modules:

```
fitPlane()
solveRoofPlane()
generateRoofMesh()
```

---

## UI responsibilities

UI only:

* collects user constraints
* displays geometry

UI must **never implement geometry logic**.

---

## Rendering

Rendering must consume **solver outputs** only.

Preferred architecture:

```
MapLibre
  + satellite tiles
  + 2D drawing layer
  + 3D mesh overlay
```

---

# Validation rules

Reject geometry if:

* footprint self-intersects
* fewer than **3 vertices**
* constraints insufficient to define plane

Warn if:

* constraints over-constrain the system
* solver must use least-squares plane fitting

---

# Stage 1 scope (MVP)

Required:

* satellite map (https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer)
* polygon footprint drawing
* vertex height editing
* edge height editing
* single-plane roof generation
* roof pitch calculation

Not included:

* multi-face roofs
* terrain elevation
* BIM modelling
* CAD export
* structural elements

---

# Definition of done (Stage 1)

A user can:

1. draw a footprint
2. assign height constraints
3. generate a dimension-accurate planar roof
4. reload project and obtain identical geometry

---

# Agent expectations

Contributors must ensure:

* geometry solver remains deterministic
* solver logic stays separate from UI
* meshes are always regenerated from constraints
* coordinate conversions remain explicit
