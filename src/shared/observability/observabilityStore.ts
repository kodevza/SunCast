import type { ObservabilityEvent } from './observability'

type ObservabilityListener = (event: ObservabilityEvent) => void

class ObservabilityStore {
  private bufferedEvents: ObservabilityEvent[] = []
  private listeners = new Set<ObservabilityListener>()
  private readonly maxBufferedEvents = 200

  record(event: ObservabilityEvent): void {
    this.bufferedEvents.push(event)
    if (this.bufferedEvents.length > this.maxBufferedEvents) {
      this.bufferedEvents.splice(0, this.bufferedEvents.length - this.maxBufferedEvents)
    }

    for (const listener of this.listeners) {
      listener(event)
    }
  }

  getBuffered(): ObservabilityEvent[] {
    return [...this.bufferedEvents]
  }

  subscribe(listener: ObservabilityListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  clear(): void {
    this.bufferedEvents = []
    this.listeners.clear()
  }
}

export const observabilityStore = new ObservabilityStore()
