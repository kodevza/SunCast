import type { FaceConstraints, FootprintPolygon, SolvedRoofPlane } from '../../types/geometry'
import { projectPointsToLocalMeters } from '../projection/localMeters'
import { fitPlane } from './fitPlane'
import { RoofSolverError } from './errors'
import { normalizeConstraints } from './normalizeConstraints'
import { validateFootprint } from './validation'

const COLLINEARITY_AREA_EPSILON_M2 = 1e-6
const REQUIRED_CONSTRAINT_COUNT = 3
const HIGH_RESIDUAL_WARNING_THRESHOLD_M = 0.15

function doubleTriangleArea(pointA: { x: number; y: number }, pointB: { x: number; y: number }, pointC: { x: number; y: number }): number {
  return Math.abs((pointB.x - pointA.x) * (pointC.y - pointA.y) - (pointB.y - pointA.y) * (pointC.x - pointA.x))
}

function selectFirstNonCollinearConstraintTriplet<T extends { x: number; y: number }>(points: T[]): [T, T, T] | null {
  for (let i = 0; i < points.length - 2; i += 1) {
    for (let j = i + 1; j < points.length - 1; j += 1) {
      for (let k = j + 1; k < points.length; k += 1) {
        if (doubleTriangleArea(points[i], points[j], points[k]) > COLLINEARITY_AREA_EPSILON_M2) {
          return [points[i], points[j], points[k]]
        }
      }
    }
  }

  return null
}

function rmsErrorForPoints(points: Array<{ x: number; y: number; z: number }>, plane: { p: number; q: number; r: number }): number {
  const squaredError = points.reduce((acc, point) => {
    const predicted = plane.p * point.x + plane.q * point.y + plane.r
    const diff = predicted - point.z
    return acc + diff * diff
  }, 0)
  return Math.sqrt(squaredError / points.length)
}

export function solveRoofPlane(footprint: FootprintPolygon, constraints: FaceConstraints): SolvedRoofPlane {
  const footprintErrors = validateFootprint(footprint)
  if (footprintErrors.length > 0) {
    throw new RoofSolverError('FOOTPRINT_INVALID', footprintErrors[0])
  }

  const { points, warnings } = normalizeConstraints(footprint, constraints)
  if (points.length < REQUIRED_CONSTRAINT_COUNT) {
    throw new RoofSolverError('CONSTRAINTS_INSUFFICIENT', 'At least 3 constrained points are required')
  }

  const selectedPoints = selectFirstNonCollinearConstraintTriplet(points)
  if (!selectedPoints) {
    throw new RoofSolverError(
      'CONSTRAINTS_COLLINEAR',
      'Constrained points are collinear and cannot define a roof plane',
    )
  }

  const fit = fitPlane(selectedPoints)
  const rmsErrorM = rmsErrorForPoints(points, fit.plane)
  const nextWarnings = [...warnings]
  if (points.length > REQUIRED_CONSTRAINT_COUNT) {
    nextWarnings.push({
      code: 'CONSTRAINTS_OVERDETERMINED',
      message: `Received ${points.length} constraints (>3). Using first 3 non-collinear constraints and ignoring ${points.length - REQUIRED_CONSTRAINT_COUNT}.`,
    })
  }
  if (rmsErrorM > HIGH_RESIDUAL_WARNING_THRESHOLD_M) {
    nextWarnings.push({
      code: 'CONSTRAINTS_RESIDUAL_HIGH',
      message: `Constraint residual RMS is ${rmsErrorM.toFixed(3)} m`,
    })
  }

  const { points2d } = projectPointsToLocalMeters(footprint.vertices)
  const vertexHeightsM = points2d.map((point) => fit.plane.p * point.x + fit.plane.q * point.y + fit.plane.r)

  return {
    plane: fit.plane,
    vertexHeightsM,
    usedLeastSquares: false,
    rmsErrorM,
    warnings: nextWarnings,
  }
}
