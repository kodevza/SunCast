// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatchGlobalErrorToastAction } from '../components/globalErrorToastActions'
import { useSunCastEffects } from './useSunCastEffects'

const mockReportAppSuccess = vi.fn()

vi.mock('./useKeyboardShortcuts', () => ({ useKeyboardShortcuts: vi.fn() }))
vi.mock('../../shared/errors', () => ({
  reportAppError: vi.fn(),
  reportAppErrorCode: vi.fn(),
  reportAppSuccess: (...args: unknown[]) => mockReportAppSuccess(...args),
  startGlobalProcessingToast: vi.fn(),
  stopGlobalProcessingToast: vi.fn(),
}))

function renderHook(args: Parameters<typeof useSunCastEffects>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function Probe() {
    useSunCastEffects(args)

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

describe('useSunCastEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/#c=shared')
  })

  it('handles reset-state action by resetting state and clearing shared hash payload', () => {
    const args = {
      projectDocument: {
        resetState: vi.fn(),
        state: {
          isDrawing: false,
          isDrawingObstacle: false,
        },
      },
      geometrySelection: {
        clearSelectionState: vi.fn(),
      },
      geometryEditing: {
        interactionError: null,
      },
      analysis: {
        computeProcessingActive: false,
        diagnostics: { solverError: null },
        sunProjection: { datetimeError: null },
        setRequestedHeatmapMode: vi.fn(),
      },
      activeFootprintErrors: [],
      obstacleMeshResults: [],
      onShareProject: vi.fn(async () => undefined),
    }

    const hook = renderHook(args as unknown as Parameters<typeof useSunCastEffects>[0])

    act(() => {
      dispatchGlobalErrorToastAction('reset-state')
    })

    expect(args.projectDocument.resetState).toHaveBeenCalledTimes(1)
    expect(args.geometrySelection.clearSelectionState).toHaveBeenCalledTimes(1)
    expect(args.analysis.setRequestedHeatmapMode).toHaveBeenCalledWith('live-shading')
    expect(window.location.hash).toBe('')
    expect(mockReportAppSuccess).toHaveBeenCalledWith('Project state reset to defaults.', {
      area: 'global-error-toast',
      source: 'reset-state',
    })

    hook.unmount()
  })
})
