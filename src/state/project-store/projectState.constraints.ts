import type { VertexHeightConstraint } from '../../types/geometry'

export function setOrReplaceVertexConstraint(
  constraints: VertexHeightConstraint[],
  value: VertexHeightConstraint,
): VertexHeightConstraint[] {
  const next = constraints.filter((constraint) => constraint.vertexIndex !== value.vertexIndex)
  next.push(value)
  return next.sort((a, b) => a.vertexIndex - b.vertexIndex)
}

export function assertValidVertexHeights(
  vertexHeights: VertexHeightConstraint[],
  vertexCount: number,
): VertexHeightConstraint[] {
  const byIndex = new Map<number, number>()
  for (const constraint of vertexHeights) {
    if (!Number.isInteger(constraint.vertexIndex)) {
      throw new Error(`Invalid vertex constraint index: ${String(constraint.vertexIndex)}`)
    }
    if (constraint.vertexIndex < 0 || constraint.vertexIndex >= vertexCount) {
      throw new Error(`Vertex constraint index ${constraint.vertexIndex} is out of range for ${vertexCount} vertices`)
    }
    if (!Number.isFinite(constraint.heightM)) {
      throw new Error(`Invalid vertex constraint height for index ${constraint.vertexIndex}`)
    }
    if (byIndex.has(constraint.vertexIndex)) {
      throw new Error(`Duplicate vertex constraint for index ${constraint.vertexIndex}`)
    }
    byIndex.set(constraint.vertexIndex, constraint.heightM)
  }

  return Array.from(byIndex.entries())
    .map(([vertexIndex, heightM]) => ({ vertexIndex, heightM }))
    .sort((a, b) => a.vertexIndex - b.vertexIndex)
}
