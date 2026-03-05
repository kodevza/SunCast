import { useEffect, useMemo, useRef, useState } from 'react'
import { DrawTools } from '../components/DrawTools/DrawTools'
import { MapView } from '../components/MapView/MapView'
import { RoofEditor } from '../components/RoofEditor/RoofEditor'
import { useProjectStore } from '../../state/project-store'
import { validateFootprint } from '../../geometry/solver/validation'
import { solveRoofPlane } from '../../geometry/solver/solveRoofPlane'
import { generateRoofMesh } from '../../geometry/mesh/generateRoofMesh'
import { clampAzimuth, computeRoofMetrics, planeSlopeFromPitchAzimuth } from '../../geometry/solver/metrics'
import { RoofSolverError } from '../../geometry/solver/errors'
import { projectPointsToLocalMeters } from '../../geometry/projection/localMeters'
import type { LngLat, RoofMeshData, SolvedRoofPlane } from '../../types/geometry'

interface SolvedEntry {
  footprintId: string
  solution: SolvedRoofPlane
  mesh: RoofMeshData
  metrics: ReturnType<typeof computeRoofMetrics>
}

function squaredDistancePointToSegment(
  point: { x: number; y: number },
  segmentStart: { x: number; y: number },
  segmentEnd: { x: number; y: number },
): number {
  const vx = segmentEnd.x - segmentStart.x
  const vy = segmentEnd.y - segmentStart.y
  const wx = point.x - segmentStart.x
  const wy = point.y - segmentStart.y
  const vv = vx * vx + vy * vy
  if (vv <= Number.EPSILON) {
    const dx = point.x - segmentStart.x
    const dy = point.y - segmentStart.y
    return dx * dx + dy * dy
  }
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv))
  const projX = segmentStart.x + t * vx
  const projY = segmentStart.y + t * vy
  const dx = point.x - projX
  const dy = point.y - projY
  return dx * dx + dy * dy
}

export function EditorScreen() {
  const [orbitEnabled, setOrbitEnabled] = useState(false)
  const [mapBearingDeg, setMapBearingDeg] = useState(0)
  const [mapPitchDeg, setMapPitchDeg] = useState(0)
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null)
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null)
  const [interactionError, setInteractionError] = useState<string | null>(null)
  const lastDebugSignatureRef = useRef<string>('')
  const {
    state,
    activeFootprint,
    activeConstraints,
    startDrawing,
    cancelDrawing,
    addDraftPoint,
    undoDraftPoint,
    commitFootprint,
    setActiveFootprint,
    deleteFootprint,
    moveVertex,
    moveEdge,
    setVertexHeight,
    setVertexHeights,
    setEdgeHeight,
    clearVertexHeight,
    clearEdgeHeight,
  } = useProjectStore()

  const footprintEntries = useMemo(() => Object.values(state.footprints), [state.footprints])
  const footprints = useMemo(() => footprintEntries.map((entry) => entry.footprint), [footprintEntries])

  const activeFootprintErrors = validateFootprint(activeFootprint)

  const vertexCount = activeFootprint?.vertices.length ?? 0
  const safeSelectedVertexIndex =
    !activeFootprint ||
    state.isDrawing ||
    selectedVertexIndex === null ||
    selectedVertexIndex < 0 ||
    selectedVertexIndex >= vertexCount
      ? null
      : selectedVertexIndex
  const safeSelectedEdgeIndex =
    !activeFootprint || state.isDrawing || selectedEdgeIndex === null || selectedEdgeIndex < 0 || selectedEdgeIndex >= vertexCount
      ? null
      : selectedEdgeIndex
  const constraintMap = useMemo(
    () => new Map(activeConstraints.vertexHeights.map((constraint) => [constraint.vertexIndex, constraint.heightM])),
    [activeConstraints.vertexHeights],
  )

  const applyVertexHeight = (vertexIndex: number, heightM: number): boolean => {
    const applied = setVertexHeight(vertexIndex, heightM)
    if (!applied) {
      setInteractionError('Failed to apply vertex height')
      return false
    }
    setInteractionError(null)
    return true
  }

  const applyEdgeHeight = (edgeIndex: number, heightM: number): boolean => {
    if (!activeFootprint || edgeIndex < 0 || edgeIndex >= activeFootprint.vertices.length) {
      setInteractionError('Failed to apply edge height')
      return false
    }
    const applied = setEdgeHeight(edgeIndex, heightM)
    if (!applied) {
      setInteractionError('Failed to apply edge height')
      return false
    }

    const end = (edgeIndex + 1) % activeFootprint.vertices.length
    const postEdgeIndices = new Set(activeConstraints.vertexHeights.map((constraint) => constraint.vertexIndex))
    postEdgeIndices.add(edgeIndex)
    postEdgeIndices.add(end)

    if (postEdgeIndices.size === 2 && activeFootprint.vertices.length >= 3) {
      const { points2d } = projectPointsToLocalMeters(activeFootprint.vertices)
      const segmentStart = points2d[edgeIndex]
      const segmentEnd = points2d[end]

      let fallbackVertexIndex: number | null = null
      let maxDistanceSq = -1
      for (let idx = 0; idx < points2d.length; idx += 1) {
        if (idx === edgeIndex || idx === end) {
          continue
        }
        const distanceSq = squaredDistancePointToSegment(points2d[idx], segmentStart, segmentEnd)
        if (distanceSq > maxDistanceSq) {
          maxDistanceSq = distanceSq
          fallbackVertexIndex = idx
        }
      }

      if (fallbackVertexIndex !== null) {
        setVertexHeight(fallbackVertexIndex, 0)
      }
    }

    setInteractionError(null)
    return true
  }

  const moveVertexIfValid = (vertexIndex: number, point: LngLat): boolean => {
    if (!activeFootprint) {
      return false
    }
    const nextVertices = [...activeFootprint.vertices]
    if (vertexIndex < 0 || vertexIndex >= nextVertices.length) {
      return false
    }
    nextVertices[vertexIndex] = point
    const errors = validateFootprint({ ...activeFootprint, vertices: nextVertices })
    if (errors.length > 0) {
      return false
    }
    moveVertex(vertexIndex, point)
    setInteractionError(null)
    return true
  }

  const moveEdgeIfValid = (edgeIndex: number, delta: LngLat): boolean => {
    if (!activeFootprint) {
      return false
    }
    const vertexTotal = activeFootprint.vertices.length
    if (edgeIndex < 0 || edgeIndex >= vertexTotal) {
      return false
    }
    const [deltaLon, deltaLat] = delta
    const start = edgeIndex
    const end = (edgeIndex + 1) % vertexTotal
    const nextVertices = [...activeFootprint.vertices]
    nextVertices[start] = [nextVertices[start][0] + deltaLon, nextVertices[start][1] + deltaLat]
    nextVertices[end] = [nextVertices[end][0] + deltaLon, nextVertices[end][1] + deltaLat]
    const errors = validateFootprint({ ...activeFootprint, vertices: nextVertices })
    if (errors.length > 0) {
      return false
    }
    moveEdge(edgeIndex, delta)
    setInteractionError(null)
    return true
  }

  const applyHeightStep = (stepM: number) => {
    if (!activeFootprint) {
      return
    }

    if (safeSelectedVertexIndex !== null) {
      const current = constraintMap.get(safeSelectedVertexIndex) ?? 0
      applyVertexHeight(safeSelectedVertexIndex, current + stepM)
      return
    }

    if (safeSelectedEdgeIndex !== null) {
      const vertexTotal = activeFootprint.vertices.length
      const start = safeSelectedEdgeIndex
      const end = (safeSelectedEdgeIndex + 1) % vertexTotal
      const nextStart = (constraintMap.get(start) ?? 0) + stepM
      const nextEnd = (constraintMap.get(end) ?? 0) + stepM
      const applied = setVertexHeights([
        { vertexIndex: start, heightM: nextStart },
        { vertexIndex: end, heightM: nextEnd },
      ])
      if (!applied) {
        setInteractionError('Failed to adjust edge heights')
        return
      }
      setInteractionError(null)
    }
  }

  const solved = useMemo(() => {
    const solvedEntries: SolvedEntry[] = []
    let activeError: string | null = null

    for (const entry of footprintEntries) {
      const errors = validateFootprint(entry.footprint)
      if (errors.length > 0) {
        if (entry.footprint.id === state.activeFootprintId) {
          activeError = errors[0]
        }
        continue
      }

      try {
        console.log('[constraints]', entry.footprint.id, entry.constraints.vertexHeights)
        const solution = solveRoofPlane(entry.footprint, entry.constraints)
        const mesh = generateRoofMesh(entry.footprint, solution.vertexHeightsM)
        console.log('[roof-mesh] triangles', {
          footprintId: entry.footprint.id,
          triangleIndexCount: mesh.triangleIndices.length,
          triangleCount: mesh.triangleIndices.length / 3,
          vertexCount: mesh.vertices.length,
        })
        const metrics = computeRoofMetrics(solution.plane, mesh)
        solvedEntries.push({
          footprintId: entry.footprint.id,
          solution,
          mesh,
          metrics,
        })
      } catch (error) {
        if (entry.footprint.id !== state.activeFootprintId) {
          continue
        }

        activeError =
          error instanceof RoofSolverError
            ? `${error.code}: ${error.message}`
            : error instanceof Error
              ? error.message
              : 'Failed to solve roof plane'
      }
    }

    const activeSolved = state.activeFootprintId
      ? solvedEntries.find((entry) => entry.footprintId === state.activeFootprintId) ?? null
      : null

    return {
      entries: solvedEntries,
      activeSolved,
      activeError,
    }
  }, [footprintEntries, state.activeFootprintId])

  const activeDiagnostics = useMemo(() => {
    if (!solved.activeSolved) {
      return null
    }
    const { mesh, metrics } = solved.activeSolved
    return {
      constraintCount: activeConstraints.vertexHeights.length,
      minHeightM: metrics.minHeightM,
      maxHeightM: metrics.maxHeightM,
      pitchDeg: metrics.pitchDeg,
      triangleCount: Math.floor(mesh.triangleIndices.length / 3),
    }
  }, [activeConstraints.vertexHeights.length, solved.activeSolved])

  useEffect(() => {
    if (!activeFootprint || !solved.activeSolved) {
      return
    }

    const { solution, metrics } = solved.activeSolved
    const userRotationDeg = clampAzimuth(mapBearingDeg)
    const worldAzimuthDeg = clampAzimuth(metrics.azimuthDeg)
    const mapRelativeAzimuthDeg = ((worldAzimuthDeg - userRotationDeg + 540) % 360) - 180
    const reconstructed = planeSlopeFromPitchAzimuth(metrics.pitchDeg, worldAzimuthDeg)
    const signature = [
      activeFootprint.id,
      metrics.pitchDeg.toFixed(4),
      worldAzimuthDeg.toFixed(4),
      userRotationDeg.toFixed(4),
      mapPitchDeg.toFixed(4),
      solution.plane.p.toFixed(6),
      solution.plane.q.toFixed(6),
      solution.plane.r.toFixed(6),
    ].join('|')

    if (lastDebugSignatureRef.current === signature) {
      return
    }
    lastDebugSignatureRef.current = signature

    const { points2d } = projectPointsToLocalMeters(activeFootprint.vertices)
    const sampleRows = points2d.map((point, idx) => {
      const solvedZ = solution.vertexHeightsM[idx]
      const [lon, lat] = activeFootprint.vertices[idx]
      const fromPitchRotationZ = reconstructed.p * point.x + reconstructed.q * point.y + solution.plane.r
      return {
        vertex: idx,
        lon: Number(lon.toFixed(7)),
        lat: Number(lat.toFixed(7)),
        heightM: Number(solvedZ.toFixed(4)),
        projectedXM: Number(point.x.toFixed(3)),
        projectedYM: Number(point.y.toFixed(3)),
        simulatedHeightM: Number(fromPitchRotationZ.toFixed(4)),
        deltaM: Number((fromPitchRotationZ - solvedZ).toExponential(2)),
      }
    })

    console.groupCollapsed(`[roof-debug] ${activeFootprint.id} pitch+rotation simulation`)
    console.log({
      pitchDeg: Number(metrics.pitchDeg.toFixed(4)),
      rotateDeg: Number(userRotationDeg.toFixed(4)),
      mapPitchDeg: Number(mapPitchDeg.toFixed(4)),
      worldAzimuthDeg: Number(worldAzimuthDeg.toFixed(4)),
      mapRelativeAzimuthDeg: Number(mapRelativeAzimuthDeg.toFixed(4)),
      tanPitch: Number(Math.tan((metrics.pitchDeg * Math.PI) / 180).toFixed(6)),
      solvedPlane: {
        p: Number(solution.plane.p.toFixed(6)),
        q: Number(solution.plane.q.toFixed(6)),
        r: Number(solution.plane.r.toFixed(6)),
      },
      reconstructedFromPitchAzimuth: {
        p: Number(reconstructed.p.toFixed(6)),
        q: Number(reconstructed.q.toFixed(6)),
      },
    })
    console.table(sampleRows)
    console.groupEnd()
  }, [activeFootprint, mapBearingDeg, mapPitchDeg, solved.activeSolved])

  return (
    <div className="editor-layout">
      <aside className="editor-panel">
        <h2>SunCast Editor</h2>
        <p className="subtitle">Geometry-first roof modeling on satellite imagery</p>

        <DrawTools
          isDrawing={state.isDrawing}
          pointCount={state.drawDraft.length}
          onStart={() => {
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
            setInteractionError(null)
            startDrawing()
          }}
          onUndo={undoDraftPoint}
          onCancel={() => {
            cancelDrawing()
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
            setInteractionError(null)
          }}
          onCommit={() => {
            commitFootprint()
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
            setInteractionError(null)
          }}
        />

        <section className="panel-section">
          <h3>Footprints</h3>
          {footprints.length === 0 ? (
            <p>No footprints yet.</p>
          ) : (
            <div className="footprint-list">
              {footprints.map((footprint) => {
                const isActive = footprint.id === state.activeFootprintId
                return (
                  <button
                    key={footprint.id}
                    type="button"
                    className={`footprint-list-item${isActive ? ' footprint-list-item-active' : ''}`}
                    onClick={() => {
                      setActiveFootprint(footprint.id)
                      setSelectedVertexIndex(null)
                      setSelectedEdgeIndex(null)
                      setInteractionError(null)
                    }}
                  >
                    {footprint.id}
                  </button>
                )
              })}
            </div>
          )}

          <button
            type="button"
            disabled={!state.activeFootprintId}
            onClick={() => {
              if (!state.activeFootprintId) {
                return
              }
              deleteFootprint(state.activeFootprintId)
              setSelectedVertexIndex(null)
              setSelectedEdgeIndex(null)
              setInteractionError(null)
            }}
          >
            Delete Active Footprint
          </button>
        </section>

        <RoofEditor
          footprint={activeFootprint}
          vertexConstraints={activeConstraints.vertexHeights}
          selectedVertexIndex={safeSelectedVertexIndex}
          selectedEdgeIndex={safeSelectedEdgeIndex}
          onSetVertex={applyVertexHeight}
          onSetEdge={applyEdgeHeight}
          onClearVertex={clearVertexHeight}
          onClearEdge={clearEdgeHeight}
          onConstraintLimitExceeded={() => setInteractionError('Failed to apply height constraints')}
        />

        <section className="panel-section">
          <h3>Status</h3>
          {activeFootprintErrors.map((error) => (
            <p key={error} className="status-error">
              {error}
            </p>
          ))}
          {interactionError && <p className="status-error">{interactionError}</p>}

          {solved.activeError && <p className="status-error">{solved.activeError}</p>}

          {solved.activeSolved && (
            <>
              {solved.activeSolved.solution.warnings.map((warning) => (
                <p key={`${warning.code}:${warning.message}`} className="status-warning">
                  {warning.code}: {warning.message}
                </p>
              ))}
              <p>Pitch: {solved.activeSolved.metrics.pitchDeg.toFixed(2)} deg</p>
              <p>Downslope azimuth: {solved.activeSolved.metrics.azimuthDeg.toFixed(1)} deg</p>
              <p>Roof area: {solved.activeSolved.metrics.roofAreaM2.toFixed(2)} m2</p>
              <p>
                Height range: {solved.activeSolved.metrics.minHeightM.toFixed(2)}m -{' '}
                {solved.activeSolved.metrics.maxHeightM.toFixed(2)}m
              </p>
              <p>Fit RMS error: {solved.activeSolved.solution.rmsErrorM.toFixed(3)} m</p>
            </>
          )}
        </section>
      </aside>

      <main className="editor-map-wrap">
        <MapView
          footprints={footprints}
          activeFootprint={activeFootprint}
          drawDraft={state.drawDraft}
          isDrawing={state.isDrawing}
          orbitEnabled={orbitEnabled}
          onToggleOrbit={() => setOrbitEnabled((enabled) => !enabled)}
          roofMeshes={solved.entries.map((entry) => entry.mesh)}
          vertexConstraints={activeConstraints.vertexHeights}
          selectedVertexIndex={safeSelectedVertexIndex}
          selectedEdgeIndex={safeSelectedEdgeIndex}
          onSelectVertex={(vertexIndex) => {
            setSelectedVertexIndex(vertexIndex)
            setSelectedEdgeIndex(null)
            setInteractionError(null)
          }}
          onSelectEdge={(edgeIndex) => {
            setSelectedEdgeIndex(edgeIndex)
            setSelectedVertexIndex(null)
            setInteractionError(null)
          }}
          onSelectFootprint={(footprintId) => {
            setActiveFootprint(footprintId)
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
            setInteractionError(null)
          }}
          onClearSelection={() => {
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
            setInteractionError(null)
          }}
          onMoveVertex={moveVertexIfValid}
          onMoveEdge={moveEdgeIfValid}
          onMoveRejected={() => setInteractionError('Footprint cannot self-intersect')}
          onAdjustHeight={applyHeightStep}
          showSolveHint={!solved.activeSolved}
          diagnostics={activeDiagnostics}
          onMapClick={addDraftPoint}
          onBearingChange={setMapBearingDeg}
          onPitchChange={setMapPitchDeg}
        />
      </main>
    </div>
  )
}
