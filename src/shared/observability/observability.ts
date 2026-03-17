import { observabilityStore } from './observabilityStore'

type EventKind = 'event' | 'error' | 'metric'

export interface ObservabilityEvent {
  kind: EventKind
  name: string
  timestampIso: string
  data?: Record<string, unknown>
}

function normalizeData(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  return value as Record<string, unknown>
}

function pushEvent(event: ObservabilityEvent): void {
  observabilityStore.record(event)
}

export function recordEvent(name: string, data?: Record<string, unknown>): void {
  pushEvent({
    kind: 'event',
    name,
    timestampIso: new Date().toISOString(),
    data: normalizeData(data),
  })
}

export function captureException(error: unknown, data?: Record<string, unknown>): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorName = error instanceof Error ? error.name : 'UnknownError'

  pushEvent({
    kind: 'error',
    name: 'exception',
    timestampIso: new Date().toISOString(),
    data: {
      errorName,
      errorMessage,
      ...normalizeData(data),
    },
  })
}

export function recordMetric(name: string, value: number, data?: Record<string, unknown>): void {
  pushEvent({
    kind: 'metric',
    name,
    timestampIso: new Date().toISOString(),
    data: {
      value,
      ...normalizeData(data),
    },
  })
}

export function getBufferedObservabilityEvents(): ObservabilityEvent[] {
  return observabilityStore.getBuffered()
}

export function subscribeObservabilityEvents(listener: (event: ObservabilityEvent) => void): () => void {
  return observabilityStore.subscribe(listener)
}

export function resetObservabilityStoreForTests(): void {
  observabilityStore.clear()
}
