import { useMemo, useState } from 'react'
import type { EdgeHeightConstraint, FootprintPolygon, VertexHeightConstraint } from '../../../types/geometry'

interface RoofEditorProps {
  footprint: FootprintPolygon | null
  vertexConstraints: VertexHeightConstraint[]
  edgeConstraints: EdgeHeightConstraint[]
  onSetVertex: (idx: number, value: number) => void
  onSetEdge: (idx: number, value: number) => void
  onClearVertex: (idx: number) => void
  onClearEdge: (idx: number) => void
}

function indexByVertex(constraints: VertexHeightConstraint[]): Map<number, number> {
  return new Map(constraints.map((c) => [c.vertexIndex, c.heightM]))
}

function indexByEdge(constraints: EdgeHeightConstraint[]): Map<number, number> {
  return new Map(constraints.map((c) => [c.edgeIndex, c.heightM]))
}

export function RoofEditor({
  footprint,
  vertexConstraints,
  edgeConstraints,
  onSetVertex,
  onSetEdge,
  onClearVertex,
  onClearEdge,
}: RoofEditorProps) {
  const [vertexInputs, setVertexInputs] = useState<Record<number, string>>({})
  const [edgeInputs, setEdgeInputs] = useState<Record<number, string>>({})

  const vertexIndex = useMemo(() => indexByVertex(vertexConstraints), [vertexConstraints])
  const edgeIndex = useMemo(() => indexByEdge(edgeConstraints), [edgeConstraints])

  if (!footprint) {
    return (
      <section className="panel-section">
        <h3>Constraints</h3>
        <p>Draw a footprint polygon first.</p>
      </section>
    )
  }

  const vertexCount = footprint.vertices.length

  return (
    <section className="panel-section">
      <h3>Constraints</h3>
      <p>Set vertex or edge heights in meters.</p>

      <h4>Vertex Heights</h4>
      <div className="constraint-grid">
        {footprint.vertices.map((_, idx) => {
          const current = vertexIndex.get(idx)
          const textValue = vertexInputs[idx] ?? ''

          return (
            <div key={`vertex-${idx}`} className="constraint-row">
              <span>V{idx}</span>
              <input
                type="number"
                step="0.01"
                placeholder={current !== undefined ? current.toFixed(2) : 'm'}
                value={textValue}
                onChange={(event) =>
                  setVertexInputs((prev) => ({
                    ...prev,
                    [idx]: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                onClick={() => {
                  const value = Number(textValue)
                  if (!Number.isFinite(value)) {
                    return
                  }
                  onSetVertex(idx, value)
                  setVertexInputs((prev) => ({ ...prev, [idx]: '' }))
                }}
              >
                Set
              </button>
              <button type="button" onClick={() => onClearVertex(idx)} disabled={current === undefined}>
                Clear
              </button>
            </div>
          )
        })}
      </div>

      <h4>Edge Heights</h4>
      <div className="constraint-grid">
        {Array.from({ length: vertexCount }).map((_, idx) => {
          const current = edgeIndex.get(idx)
          const textValue = edgeInputs[idx] ?? ''

          return (
            <div key={`edge-${idx}`} className="constraint-row">
              <span>
                E{idx} (V{idx}-V{(idx + 1) % vertexCount})
              </span>
              <input
                type="number"
                step="0.01"
                placeholder={current !== undefined ? current.toFixed(2) : 'm'}
                value={textValue}
                onChange={(event) =>
                  setEdgeInputs((prev) => ({
                    ...prev,
                    [idx]: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                onClick={() => {
                  const value = Number(textValue)
                  if (!Number.isFinite(value)) {
                    return
                  }
                  onSetEdge(idx, value)
                  setEdgeInputs((prev) => ({ ...prev, [idx]: '' }))
                }}
              >
                Set
              </button>
              <button type="button" onClick={() => onClearEdge(idx)} disabled={current === undefined}>
                Clear
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
