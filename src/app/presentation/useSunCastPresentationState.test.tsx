// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSunCastPresentationState } from './useSunCastPresentationState'

const mockUseProjectDocument = vi.fn()
const mockUseEditorSession = vi.fn()
const mockUseAnalysis = vi.fn()
const mockUseObstacleMeshResults = vi.fn()
const mockUseSunCastRuntimeActions = vi.fn()
const mockUseSunCastRuntimeEffects = vi.fn()

vi.mock('../project-store/useProjectDocument', () => ({
  useProjectDocument: () => mockUseProjectDocument(),
}))

vi.mock('../editor-session/useEditorSession', () => ({
  useEditorSession: (...args: unknown[]) => mockUseEditorSession(...args),
}))

vi.mock('../analysis/useAnalysis', () => ({
  useAnalysis: (...args: unknown[]) => mockUseAnalysis(...args),
}))

vi.mock('../hooks/useObstacleMeshResults', () => ({
  useObstacleMeshResults: (...args: unknown[]) => mockUseObstacleMeshResults(...args),
}))

vi.mock('../hooks/useSunCastRuntimeActions', () => ({
  useSunCastRuntimeActions: (...args: unknown[]) => mockUseSunCastRuntimeActions(...args),
}))

vi.mock('../hooks/useSunCastRuntimeEffects', () => ({
  useSunCastRuntimeEffects: (...args: unknown[]) => mockUseSunCastRuntimeEffects(...args),
}))

vi.mock('../../geometry/solver/validation', () => ({ validateFootprint: vi.fn(() => []) }))

function renderHook() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const latestRef: { current: ReturnType<typeof useSunCastPresentationState> | null } = { current: null }

  function Probe() {
    const latest = useSunCastPresentationState()
    const sharedRef = useRef(latestRef)

    useEffect(() => {
      sharedRef.current.current = latest
    }, [latest, sharedRef])

    return null
  }

  act(() => {
    root.render(<Probe />)
  })

  return {
    get: () => {
      if (!latestRef.current) {
        throw new Error('Hook did not render')
      }
      return latestRef.current
    },
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('useSunCastPresentationState', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const store = {
      state: {
        footprints: {},
        activeFootprintId: null,
        selectedFootprintIds: [],
        drawDraft: [],
        isDrawing: false,
        obstacles: {},
        activeObstacleId: null,
        selectedObstacleIds: [],
        obstacleDrawDraft: [],
        isDrawingObstacle: false,
        sunProjection: { enabled: true, datetimeIso: null, dailyDateIso: null },
        shadingSettings: { enabled: true, gridResolutionM: 0.5 },
      },
      moveVertex: vi.fn(),
      moveEdge: vi.fn(),
      setVertexHeight: vi.fn(),
      setVertexHeights: vi.fn(),
      setEdgeHeight: vi.fn(),
      setSunProjectionDatetimeIso: vi.fn(),
      setSunProjectionDailyDateIso: vi.fn(),
    }

    mockUseProjectDocument.mockReturnValue({
      store,
      stateRevision: 1,
      footprintEntries: [],
      footprints: [],
      activeFootprint: null,
      activeConstraints: { vertexHeights: [] },
      obstacles: [],
      activeObstacle: null,
      selectedObstacles: [{ id: 'obstacle-1' }],
      selectedFootprintIds: [],
      sunProjection: store.state.sunProjection,
      shadingSettings: store.state.shadingSettings,
    })

    mockUseEditorSession.mockReturnValue({
      safeSelectedVertexIndex: null,
      safeSelectedEdgeIndex: null,
      isGeometryDragActive: false,
    })

    mockUseAnalysis.mockReturnValue({
      solvedMetrics: {
        basePitchDeg: null,
      },
    })

    mockUseObstacleMeshResults.mockReturnValue({
      obstacleMeshResults: [{ ok: true, value: { id: 'mesh-1' } }],
    })

    mockUseSunCastRuntimeActions.mockReturnValue({
      mapNavigationTarget: { id: 1, lon: 1, lat: 2 },
      onPlaceSearchSelect: vi.fn(),
      onShareProject: vi.fn(async () => undefined),
    })
  })

  it('keeps presentation as state composition and delegates runtime wiring', () => {
    const hook = renderHook()
    const state = hook.get()

    expect(mockUseSunCastRuntimeActions).toHaveBeenCalledWith(state.projectDocument)
    expect(mockUseSunCastRuntimeEffects).toHaveBeenCalledWith({
      projectDocument: state.projectDocument,
      editorSession: state.editorSession,
      analysis: state.analysis,
      activeFootprintErrors: state.activeFootprintErrors,
      obstacleMeshResults: state.obstacleMeshes,
      onShareProject: state.onShareProject,
    })
    expect(state.obstacleMeshes).toEqual([{ ok: true, value: { id: 'mesh-1' } }])
    expect(state.selectedObstacleIds).toEqual(['obstacle-1'])

    hook.unmount()
  })
})
