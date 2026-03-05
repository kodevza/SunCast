import type { SolverErrorCode } from '../../types/geometry'

export class RoofSolverError extends Error {
  readonly code: SolverErrorCode

  constructor(code: SolverErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'RoofSolverError'
  }
}

