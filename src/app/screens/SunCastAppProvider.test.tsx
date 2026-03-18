// @vitest-environment jsdom
import { act, useEffect, useRef } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { beforeEach, vi } from 'vitest'
import { describe, expect, it } from 'vitest'
import { SunCastAppProvider, useSunCastAppContext } from './SunCastAppProvider'

const mockUseEditorSession = vi.fn()
const mockUseAnalysis = vi.fn()
const mockUseObstacleMeshResults = vi.fn()
const mockUseSunCastCommands = vi.fn()

vi.mock('../editor-session/useEditorSession', () => ({
  useEditorSession: (...args: unknown[]) => mockUseEditorSession(...args),
}))

vi.mock('../analysis/useAnalysis', () => ({
  useAnalysis: (...args: unknown[]) => mockUseAnalysis(...args),
}))

vi.mock('../hooks/useObstacleMeshResults', () => ({
  useObstacleMeshResults: (...args: unknown[]) => mockUseObstacleMeshResults(...args),
}))

vi.mock('../hooks/useSunCastCommands', () => ({
  useSunCastCommands: (...args: unknown[]) => mockUseSunCastCommands(...args),
}))

function StartDrawingProbe() {
  const { project } = useSunCastAppContext()
  const didStartDrawing = useRef(false)

  useEffect(() => {
    if (didStartDrawing.current) {
      return
    }

    didStartDrawing.current = true
    project.startDrawing()
  }, [project])

  return null
}

function DrawingStateProbe() {
  const { project } = useSunCastAppContext()

  return <div data-testid="drawing-state">{String(project.state.isDrawing)}</div>
}

describe('SunCastAppProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseEditorSession.mockReturnValue({
      safeSelectedVertexIndex: null,
      safeSelectedEdgeIndex: null,
      isGeometryDragActive: false,
      orbitEnabled: false,
      mapInitialized: false,
      tutorialEditedKwpByFootprint: {},
      tutorialDatetimeEdited: false,
      tutorialStartRef: { current: vi.fn() },
      clearSelectionState: vi.fn(),
      setOrbitEnabled: vi.fn(),
      setEditMode: vi.fn(),
      setMapInitialized: vi.fn(),
      setMapBearingDeg: vi.fn(),
      setMapPitchDeg: vi.fn(),
      setIsGeometryDragActive: vi.fn(),
      setTutorialEditedKwpByFootprint: vi.fn(),
      setTutorialDatetimeEdited: vi.fn(),
      setTutorialStart: vi.fn(),
      interactionError: null,
      applyVertexHeight: vi.fn(),
      applyEdgeHeight: vi.fn(),
      moveVertexIfValid: vi.fn(),
      moveEdgeIfValid: vi.fn(),
      applyHeightStep: vi.fn(),
      setConstraintLimitError: vi.fn(),
      setMoveRejectedError: vi.fn(),
      selectVertex: vi.fn(),
      selectEdge: vi.fn(),
      clearInteractionError: vi.fn(),
    })

    mockUseAnalysis.mockReturnValue({
      computeProcessingActive: false,
      sunProjection: {
        hasValidDatetime: true,
        datetimeError: null,
        datetimeRaw: '',
        dailyDateRaw: '',
        dailyTimeZone: 'UTC',
        result: null,
        onDatetimeInputChange: vi.fn(),
      },
      annualSimulation: {
        state: 'IDLE',
        progress: { ratio: 0 },
        result: null,
        error: null,
        heatmapFeatures: [],
        runSimulation: vi.fn(async () => undefined),
        clearSimulation: vi.fn(),
      },
      heatmap: {
        activeMode: 'none',
        annualVisible: false,
        annualFeatures: [],
        liveFeatures: [],
        mapFeatures: [],
        mapComputeState: 'IDLE',
        mapEnabled: false,
      },
      liveShading: {
        computeMode: 'final',
        resultStatus: null,
        statusMessage: null,
        diagnostics: null,
        usedGridResolutionM: null,
      },
      solvedRoofs: {
        activeSolved: null,
        entries: [],
        activeError: null,
      },
      shadingRoofs: [],
      diagnostics: {
        solverError: null,
        warnings: [],
        shadingResultStatus: null,
        shadingStatusMessage: null,
        shadingDiagnostics: null,
      },
      productionComputationEnabled: true,
      setRequestedHeatmapMode: vi.fn(),
      solvedMetrics: {
        basePitchDeg: null,
        azimuthDeg: null,
        roofAreaM2: null,
        minHeightM: null,
        maxHeightM: null,
        fitRmsErrorM: null,
      },
    })

    mockUseObstacleMeshResults.mockReturnValue({
      obstacleMeshResults: [],
      obstacleMeshes: [],
    })

    mockUseSunCastCommands.mockReturnValue({
      mapNavigationTarget: null,
      onPlaceSearchSelect: vi.fn(),
      onShareProject: vi.fn(async () => undefined),
    })
  })

  it('shares one project store across sibling consumers', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <SunCastAppProvider>
          <StartDrawingProbe />
          <DrawingStateProbe />
        </SunCastAppProvider>,
      )
    })

    expect(container.querySelector('[data-testid="drawing-state"]')?.textContent).toBe('true')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
