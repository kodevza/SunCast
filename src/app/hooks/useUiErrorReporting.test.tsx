// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiErrorReporting } from './useUiErrorReporting'

const mockReportAppErrorCode = vi.fn()

vi.mock('../../shared/errors', () => ({
  reportAppErrorCode: (...args: unknown[]) => mockReportAppErrorCode(...args),
}))

function renderHook(args: Parameters<typeof useUiErrorReporting>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function Probe() {
    useUiErrorReporting(args)

    useEffect(() => undefined, [])
    return null
  }

  act(() => {
    root.render(<Probe />)
  })

  return {
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('useUiErrorReporting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports geometry interaction errors once with the interaction source', () => {
    const hook = renderHook({
      activeFootprintErrors: [],
      geometrySelection: {} as never,
      geometryEditing: {
        interactionError: 'Cannot move selected vertex',
      },
      analysis: {
        diagnostics: { solverError: null },
        sunProjection: { datetimeError: null },
      },
    } as unknown as Parameters<typeof useUiErrorReporting>[0])

    expect(mockReportAppErrorCode).toHaveBeenCalledTimes(1)
    expect(mockReportAppErrorCode).toHaveBeenCalledWith(
      'INTERACTION_FAILED',
      'Cannot move selected vertex',
      {
        context: { area: 'status-panel', source: 'interaction' },
      },
    )

    hook.unmount()
  })
})
