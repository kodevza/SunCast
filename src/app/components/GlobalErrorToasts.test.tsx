// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalErrorToasts } from './GlobalErrorToasts'
import {
  type ObservabilityEvent,
  recordEvent,
  resetObservabilityStoreForTests,
} from '../../shared/observability/observability'
import { toastActionService } from '../globalServices/toastActionService'

function renderToasts() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<GlobalErrorToasts />)
  })

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function emitObservabilityEvent(event: ObservabilityEvent) {
  act(() => {
    recordEvent(event.name, event.data)
  })
}

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  resetObservabilityStoreForTests()
})

describe('GlobalErrorToasts', () => {
  it('shows reset and share buttons for reset-enabled errors', () => {
    const onAction = vi.fn()
    const view = renderToasts()
    const unsubscribe = toastActionService.subscribe(onAction)

    emitObservabilityEvent({
      kind: 'event',
      name: 'app.error',
      timestampIso: new Date().toISOString(),
      data: {
        message: 'Recoverable payload error.',
        severity: 'warning',
        enableStateReset: true,
      },
    })

    const resetButton = view.container.querySelector('[data-testid="global-error-toast-reset-state"]') as HTMLButtonElement
    const shareButton = view.container.querySelector('[data-testid="global-error-toast-share-state"]') as HTMLButtonElement
    expect(resetButton).not.toBeNull()
    expect(shareButton).not.toBeNull()

    act(() => {
      resetButton.click()
    })
    act(() => {
      shareButton.click()
    })

    expect(onAction).toHaveBeenCalledTimes(2)
    expect(onAction.mock.calls[0][0]).toBe('reset-state')
    expect(onAction.mock.calls[1][0]).toBe('share-state')

    unsubscribe()
    view.unmount()
  })

  it('does not show reset/share buttons for regular errors', () => {
    const view = renderToasts()

    emitObservabilityEvent({
      kind: 'event',
      name: 'app.error',
      timestampIso: new Date().toISOString(),
      data: {
        message: 'Regular warning without reset.',
        severity: 'warning',
      },
    })

    expect(view.container.querySelector('[data-testid="global-error-toast-reset-state"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="global-error-toast-share-state"]')).toBeNull()
    view.unmount()
  })

  it('renders info toasts for processing notifications', () => {
    const view = renderToasts()

    emitObservabilityEvent({
      kind: 'event',
      name: 'app.info',
      timestampIso: new Date().toISOString(),
      data: {
        message: 'Processing...',
      },
    })

    const toast = view.container.querySelector('.global-error-toast-info')
    expect(toast?.textContent).toContain('Processing...')
    view.unmount()
  })

  it('keeps sticky processing toast visible until dismissed', () => {
    vi.useFakeTimers()
    const view = renderToasts()

    emitObservabilityEvent({
      kind: 'event',
      name: 'app.info',
      timestampIso: new Date().toISOString(),
      data: {
        message: 'Processing...',
        sticky: true,
        toastKey: 'compute-processing',
      },
    })

    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(view.container.textContent).toContain('Processing...')

    emitObservabilityEvent({
      kind: 'event',
      name: 'app.info.dismiss',
      timestampIso: new Date().toISOString(),
      data: {
        toastKey: 'compute-processing',
      },
    })
    expect(view.container.textContent).not.toContain('Processing...')
    view.unmount()
  })
})
