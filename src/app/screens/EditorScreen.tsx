import { useMemo, useState } from 'react'
import { DrawTools } from '../components/DrawTools/DrawTools'
import { MapView } from '../components/MapView/MapView'
import { RoofEditor } from '../components/RoofEditor/RoofEditor'
import { useProjectStore } from '../../state/project-store'
import { validateFootprint } from '../../geometry/solver/validation'
import { solveRoofPlane } from '../../geometry/solver/solveRoofPlane'
import { generateRoofMesh } from '../../geometry/mesh/generateRoofMesh'
import { computeRoofMetrics } from '../../geometry/solver/metrics'
import { RoofSolverError } from '../../geometry/solver/errors'
import type { RoofMeshData, SolvedRoofPlane } from '../../types/geometry'

interface SolvedEntry {
  footprintId: string
  solution: SolvedRoofPlane
  mesh: RoofMeshData
  metrics: ReturnType<typeof computeRoofMetrics>
}

export function EditorScreen() {
  const [orbitEnabled, setOrbitEnabled] = useState(false)
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null)
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null)
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
    setVertexHeight,
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
        const solution = solveRoofPlane(entry.footprint, entry.constraints)
        const mesh = generateRoofMesh(entry.footprint, solution.vertexHeightsM)
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
            startDrawing()
          }}
          onUndo={undoDraftPoint}
          onCancel={() => {
            cancelDrawing()
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
          }}
          onCommit={() => {
            commitFootprint()
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
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
          onSetVertex={setVertexHeight}
          onSetEdge={setEdgeHeight}
          onClearVertex={clearVertexHeight}
          onClearEdge={clearEdgeHeight}
        />

        <section className="panel-section">
          <h3>Status</h3>
          {activeFootprintErrors.map((error) => (
            <p key={error} className="status-error">
              {error}
            </p>
          ))}

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
          }}
          onSelectEdge={(edgeIndex) => {
            setSelectedEdgeIndex(edgeIndex)
            setSelectedVertexIndex(null)
          }}
          onSelectFootprint={(footprintId) => {
            setActiveFootprint(footprintId)
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
          }}
          onClearSelection={() => {
            setSelectedVertexIndex(null)
            setSelectedEdgeIndex(null)
          }}
          showSolveHint={!solved.activeSolved}
          onMapClick={addDraftPoint}
        />
      </main>
    </div>
  )
}
