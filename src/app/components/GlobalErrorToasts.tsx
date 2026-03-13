import { useEffect, useMemo, useState } from 'react'
import { OBSERVABILITY_EVENT_NAME, getBufferedObservabilityEvents, type ObservabilityEvent } from '../../shared/observability/observability'
import type { AppErrorSeverity } from '../../shared/errors'
import { dispatchGlobalErrorToastAction } from './globalErrorToastActions'

interface ToastItem {
  id: string
  message: string
  severity: AppErrorSeverity | 'success'
  enableStateReset: boolean
  persistent: boolean
  toastKey: string | null
}

const TOAST_TTL_MS = 7000
const MAX_TOASTS = 4

function toToast(event: ObservabilityEvent): ToastItem | null {
  if (event.kind !== 'event' || (event.name !== 'app.error' && event.name !== 'app.success' && event.name !== 'app.info')) {
    return null
  }

  const message = typeof event.data?.message === 'string' ? event.data.message : null
  const severity =
    event.name === 'app.success'
      ? 'success'
      : event.name === 'app.info'
        ? 'info'
      : typeof event.data?.severity === 'string'
        ? (event.data.severity as AppErrorSeverity)
        : 'error'
  const enableStateReset = event.name === 'app.error' && event.data?.enableStateReset === true
  const persistent = event.name === 'app.info' && event.data?.sticky === true
  const toastKey = typeof event.data?.toastKey === 'string' ? event.data.toastKey : null
  if (!message) {
    return null
  }

  return {
    id: `${event.timestampIso}:${message}`,
    message,
    severity,
    enableStateReset,
    persistent,
    toastKey,
  }
}

export function GlobalErrorToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>(() => {
    return getBufferedObservabilityEvents()
      .map(toToast)
      .filter((entry): entry is ToastItem => Boolean(entry))
      .slice(-MAX_TOASTS)
  })

  useEffect(() => {
    const onEvent = (rawEvent: Event) => {
      const customEvent = rawEvent as CustomEvent<ObservabilityEvent>
      if (
        customEvent.detail.kind === 'event' &&
        customEvent.detail.name === 'app.info.dismiss' &&
        typeof customEvent.detail.data?.toastKey === 'string'
      ) {
        const toastKey = customEvent.detail.data.toastKey
        setToasts((previous) => previous.filter((item) => item.toastKey !== toastKey))
        return
      }
      const next = toToast(customEvent.detail)
      if (!next) {
        return
      }

      setToasts((previous) => {
        if (
          previous.some(
            (item) =>
              item.message === next.message &&
              item.severity === next.severity &&
              item.enableStateReset === next.enableStateReset &&
              item.toastKey === next.toastKey,
          )
        ) {
          return previous
        }
        return [...previous.slice(-(MAX_TOASTS - 1)), next]
      })

      if (!next.persistent) {
        window.setTimeout(() => {
          setToasts((previous) => previous.filter((item) => item.id !== next.id))
        }, TOAST_TTL_MS)
      }
    }

    window.addEventListener(OBSERVABILITY_EVENT_NAME, onEvent)
    return () => window.removeEventListener(OBSERVABILITY_EVENT_NAME, onEvent)
  }, [])

  const visibleToasts = useMemo(() => toasts.slice(-MAX_TOASTS), [toasts])

  if (visibleToasts.length === 0) {
    return null
  }

  return (
    <section className="global-error-toast-stack" aria-live="polite" aria-label="Application errors" data-testid="global-error-toasts">
      {visibleToasts.map((toast) => (
        <div key={toast.id} className={`global-error-toast global-error-toast-${toast.severity}`} role="status">
          <div>{toast.message}</div>
          {toast.enableStateReset ? (
            <div className="global-error-toast-actions">
              <button
                type="button"
                data-testid="global-error-toast-reset-state"
                onClick={() => dispatchGlobalErrorToastAction('reset-state')}
              >
                Reset state
              </button>
              <button
                type="button"
                data-testid="global-error-toast-share-state"
                onClick={() => dispatchGlobalErrorToastAction('share-state')}
              >
                Share state URL
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </section>
  )
}
