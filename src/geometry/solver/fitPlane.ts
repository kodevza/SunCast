import type { RoofPlane } from '../../types/geometry'

export interface PlaneConstraintPoint {
  x: number
  y: number
  z: number
}

export interface FitPlaneResult {
  plane: RoofPlane
  usedLeastSquares: boolean
  rmsErrorM: number
}

const NUMERIC_EPS = 1e-12

function solve3x3(matrix: number[][], vector: number[]): [number, number, number] {
  const a = matrix.map((row) => [...row])
  const b = [...vector]

  for (let i = 0; i < 3; i += 1) {
    let pivotRow = i
    for (let r = i + 1; r < 3; r += 1) {
      if (Math.abs(a[r][i]) > Math.abs(a[pivotRow][i])) {
        pivotRow = r
      }
    }

    if (Math.abs(a[pivotRow][i]) < NUMERIC_EPS) {
      throw new Error('Singular system')
    }

    if (pivotRow !== i) {
      ;[a[i], a[pivotRow]] = [a[pivotRow], a[i]]
      ;[b[i], b[pivotRow]] = [b[pivotRow], b[i]]
    }

    const pivot = a[i][i]
    for (let c = i; c < 3; c += 1) {
      a[i][c] /= pivot
    }
    b[i] /= pivot

    for (let r = 0; r < 3; r += 1) {
      if (r === i) {
        continue
      }
      const factor = a[r][i]
      for (let c = i; c < 3; c += 1) {
        a[r][c] -= factor * a[i][c]
      }
      b[r] -= factor * b[i]
    }
  }

  return [b[0], b[1], b[2]]
}

function rmsError(points: PlaneConstraintPoint[], plane: RoofPlane): number {
  const squaredError = points.reduce((acc, point) => {
    const predicted = plane.p * point.x + plane.q * point.y + plane.r
    const diff = predicted - point.z
    return acc + diff * diff
  }, 0)
  return Math.sqrt(squaredError / points.length)
}

export function fitPlane(points: PlaneConstraintPoint[]): FitPlaneResult {
  const n = points.length

  const sumX = points.reduce((acc, p) => acc + p.x, 0)
  const sumY = points.reduce((acc, p) => acc + p.y, 0)
  const sumZ = points.reduce((acc, p) => acc + p.z, 0)
  const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0)
  const sumYY = points.reduce((acc, p) => acc + p.y * p.y, 0)
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0)
  const sumXZ = points.reduce((acc, p) => acc + p.x * p.z, 0)
  const sumYZ = points.reduce((acc, p) => acc + p.y * p.z, 0)

  const lhs = [
    [sumXX, sumXY, sumX],
    [sumXY, sumYY, sumY],
    [sumX, sumY, n],
  ]
  const rhs = [sumXZ, sumYZ, sumZ]

  const [p, q, r] = solve3x3(lhs, rhs)
  const plane = { p, q, r }

  return {
    plane,
    usedLeastSquares: points.length > 3,
    rmsErrorM: rmsError(points, plane),
  }
}

