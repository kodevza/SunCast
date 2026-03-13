import { captureException, recordEvent } from '../observability/observability'
import { createAppError, type AppError, type AppErrorCode } from './appError'

function toSerializableCause(value: unknown): Record<string, unknown> | undefined {
  if (!value) {
    return undefined
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    }
  }
  if (typeof value === 'string') {
    return { message: value }
  }
  return { value: String(value) }
}

export function reportAppError(error: AppError): void {
  recordEvent('app.error', {
    code: error.code,
    message: error.message,
    severity: error.severity,
    recoverable: error.recoverable,
    ...error.context,
    cause: toSerializableCause(error.cause),
  })

  if (error.severity === 'error' || error.severity === 'fatal') {
    captureException(error.cause ?? new Error(error.message), {
      code: error.code,
      severity: error.severity,
      recoverable: error.recoverable,
      ...error.context,
    })
  }
}

export function reportAppErrorCode(
  code: AppErrorCode,
  message: string,
  options?: {
    cause?: unknown
    context?: Record<string, unknown>
  },
): AppError {
  const appError = createAppError(code, message, options)
  reportAppError(appError)
  return appError
}

export function reportAppSuccess(message: string, context?: Record<string, unknown>): void {
  recordEvent('app.success', {
    message,
    severity: 'info',
    ...context,
  })
}

export function reportAppInfo(message: string, context?: Record<string, unknown>): void {
  recordEvent('app.info', {
    message,
    severity: 'info',
    ...context,
  })
}

export function dismissAppInfoToast(toastKey: string): void {
  recordEvent('app.info.dismiss', {
    toastKey,
  })
}

const GLOBAL_COMPUTE_TOAST_KEY = 'compute-processing'
const activeProcessingSources = new Set<string>()
const MIN_PROCESSING_TOAST_VISIBLE_MS = 2000
const MAX_PROCESSING_TOAST_VISIBLE_MS = 60000

let processingToastVisible = false
let processingToastShownAtMs = 0
let processingToastMinDismissTimer: ReturnType<typeof setTimeout> | null = null
let processingToastMaxDismissTimer: ReturnType<typeof setTimeout> | null = null
let processingToastSuppressedUntilIdle = false

function clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
  if (timer !== null) {
    clearTimeout(timer)
  }
}

function dismissProcessingToast(): void {
  if (!processingToastVisible) {
    return
  }
  dismissAppInfoToast(GLOBAL_COMPUTE_TOAST_KEY)
  processingToastVisible = false
  processingToastShownAtMs = 0
  clearTimer(processingToastMinDismissTimer)
  clearTimer(processingToastMaxDismissTimer)
  processingToastMinDismissTimer = null
  processingToastMaxDismissTimer = null
}

function ensureProcessingToastVisible(message: string): void {
  if (processingToastVisible || processingToastSuppressedUntilIdle) {
    return
  }

  reportAppInfo(message, {
    area: 'compute-progress',
    sticky: true,
    toastKey: GLOBAL_COMPUTE_TOAST_KEY,
  })
  processingToastVisible = true
  processingToastShownAtMs = Date.now()
  clearTimer(processingToastMaxDismissTimer)
  processingToastMaxDismissTimer = setTimeout(() => {
    processingToastSuppressedUntilIdle = activeProcessingSources.size > 0
    dismissProcessingToast()
  }, MAX_PROCESSING_TOAST_VISIBLE_MS)
}

function dismissProcessingToastWhenAllowed(): void {
  if (!processingToastVisible) {
    return
  }

  const elapsedMs = Date.now() - processingToastShownAtMs
  const remainingMinMs = Math.max(0, MIN_PROCESSING_TOAST_VISIBLE_MS - elapsedMs)
  clearTimer(processingToastMinDismissTimer)
  processingToastMinDismissTimer = setTimeout(() => {
    if (activeProcessingSources.size > 0) {
      return
    }
    dismissProcessingToast()
  }, remainingMinMs)
}

export function startGlobalProcessingToast(source: string, message = 'Processing...'): void {
  const normalizedSource = source.trim()
  if (!normalizedSource) {
    return
  }
  if (processingToastSuppressedUntilIdle && activeProcessingSources.size === 0) {
    processingToastSuppressedUntilIdle = false
  }
  activeProcessingSources.add(normalizedSource)
  clearTimer(processingToastMinDismissTimer)
  processingToastMinDismissTimer = null
  ensureProcessingToastVisible(message)
}

export function stopGlobalProcessingToast(source: string): void {
  const normalizedSource = source.trim()
  if (!normalizedSource) {
    return
  }
  activeProcessingSources.delete(normalizedSource)
  if (activeProcessingSources.size === 0) {
    processingToastSuppressedUntilIdle = false
    dismissProcessingToastWhenAllowed()
  }
}
