export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

export type AppErrorCode =
  | 'STORAGE_CORRUPTED'
  | 'SHARE_PAYLOAD_INVALID'
  | 'GEOMETRY_BUILD_FAILED'
  | 'SOLVER_FAILED'
  | 'MAP_INIT_FAILED'
  | 'PLACE_SEARCH_FAILED'
  | 'SHARE_OPERATION_FAILED'
  | 'FORECAST_FAILED'
  | 'ANNUAL_SIMULATION_FAILED'
  | 'INPUT_VALIDATION_FAILED'
  | 'INTERACTION_FAILED'
  | 'UNEXPECTED_RUNTIME_ERROR'

export interface AppError {
  code: AppErrorCode
  message: string
  severity: AppErrorSeverity
  recoverable: boolean
  cause?: unknown
  context?: Record<string, unknown>
}

interface AppErrorPolicy {
  severity: AppErrorSeverity
  recoverable: boolean
}

const APP_ERROR_POLICY: Record<AppErrorCode, AppErrorPolicy> = {
  STORAGE_CORRUPTED: { severity: 'warning', recoverable: true },
  SHARE_PAYLOAD_INVALID: { severity: 'warning', recoverable: true },
  GEOMETRY_BUILD_FAILED: { severity: 'error', recoverable: true },
  SOLVER_FAILED: { severity: 'error', recoverable: true },
  MAP_INIT_FAILED: { severity: 'error', recoverable: true },
  PLACE_SEARCH_FAILED: { severity: 'warning', recoverable: true },
  SHARE_OPERATION_FAILED: { severity: 'warning', recoverable: true },
  FORECAST_FAILED: { severity: 'warning', recoverable: true },
  ANNUAL_SIMULATION_FAILED: { severity: 'warning', recoverable: true },
  INPUT_VALIDATION_FAILED: { severity: 'warning', recoverable: true },
  INTERACTION_FAILED: { severity: 'warning', recoverable: true },
  UNEXPECTED_RUNTIME_ERROR: { severity: 'fatal', recoverable: false },
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  options?: {
    cause?: unknown
    context?: Record<string, unknown>
    severity?: AppErrorSeverity
    recoverable?: boolean
  },
): AppError {
  const policy = APP_ERROR_POLICY[code]
  return {
    code,
    message,
    cause: options?.cause,
    context: options?.context,
    severity: options?.severity ?? policy.severity,
    recoverable: options?.recoverable ?? policy.recoverable,
  }
}
