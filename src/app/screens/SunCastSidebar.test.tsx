// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { SunCastSidebar } from './SunCastSidebar'

vi.mock('../features/sidebar/FootprintPanel', () => ({ FootprintPanel: () => <div data-testid="footprint-panel" /> }))
vi.mock('../features/sidebar/RoofEditor', () => ({ RoofEditor: () => <div data-testid="roof-editor-panel" /> }))
vi.mock('../features/sidebar/ObstaclePanel', () => ({ ObstaclePanel: () => <div data-testid="obstacle-panel" /> }))
vi.mock('../features/sidebar/StatusPanel', () => ({ StatusPanel: () => null }))

function renderSidebar() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const onStartTutorial = vi.fn()

  act(() => {
    root.render(
      <SunCastSidebar
        drawTools={{
          editMode: 'roof',
          isDrawingRoof: false,
          isDrawingObstacle: false,
          roofPointCount: 0,
          obstaclePointCount: 0,
          onSetEditMode: vi.fn(),
          onStartRoofDrawing: vi.fn(),
          onUndoRoofDrawing: vi.fn(),
          onCancelRoofDrawing: vi.fn(),
          onCommitRoofDrawing: vi.fn(),
          onStartObstacleDrawing: vi.fn(),
          onUndoObstacleDrawing: vi.fn(),
          onCancelObstacleDrawing: vi.fn(),
          onCommitObstacleDrawing: vi.fn(),
        }}
        footprintPanel={{
          footprints: [],
          activeFootprintId: null,
          selectedFootprintIds: [],
          activeFootprintKwp: null,
          onShareProject: vi.fn(async () => undefined),
          onSelectFootprint: vi.fn(),
          onSetActiveFootprintKwp: vi.fn(),
          onDeleteActiveFootprint: vi.fn(),
        }}
        roofEditor={{
          footprint: null,
          vertexConstraints: [],
          selectedVertexIndex: null,
          selectedEdgeIndex: null,
          onSetVertex: vi.fn(),
          onSetEdge: vi.fn(),
          onClearVertex: vi.fn(),
          onClearEdge: vi.fn(),
          onConstraintLimitExceeded: vi.fn(),
        }}
        obstaclePanel={{
          obstacles: [],
          activeObstacle: null,
          selectedObstacleIds: [],
          onSelectObstacle: vi.fn(),
          onSetActiveObstacleKind: vi.fn(),
          onSetActiveObstacleHeight: vi.fn(),
          onDeleteActiveObstacle: vi.fn(),
        }}
        statusPanel={{
          warnings: [],
          basePitchDeg: null,
          pitchAdjustmentPercent: 0,
          adjustedPitchDeg: null,
          onSetPitchAdjustmentPercent: vi.fn(),
          azimuthDeg: null,
          roofAreaM2: null,
          minHeightM: null,
          maxHeightM: null,
          fitRmsErrorM: null,
          activeFootprintLatDeg: null,
          activeFootprintLonDeg: null,
        }}
        onStartTutorial={onStartTutorial}
      />,
    )
  })

  return {
    container,
    onStartTutorial,
    rerender: (editMode: 'roof' | 'obstacle') => {
      act(() => {
        root.render(
          <SunCastSidebar
            drawTools={{
              editMode,
              isDrawingRoof: false,
              isDrawingObstacle: false,
              roofPointCount: 0,
              obstaclePointCount: 0,
              onSetEditMode: vi.fn(),
              onStartRoofDrawing: vi.fn(),
              onUndoRoofDrawing: vi.fn(),
              onCancelRoofDrawing: vi.fn(),
              onCommitRoofDrawing: vi.fn(),
              onStartObstacleDrawing: vi.fn(),
              onUndoObstacleDrawing: vi.fn(),
              onCancelObstacleDrawing: vi.fn(),
              onCommitObstacleDrawing: vi.fn(),
            }}
            footprintPanel={{
              footprints: [],
              activeFootprintId: null,
              selectedFootprintIds: [],
              activeFootprintKwp: null,
              onShareProject: vi.fn(async () => undefined),
              onSelectFootprint: vi.fn(),
              onSetActiveFootprintKwp: vi.fn(),
              onDeleteActiveFootprint: vi.fn(),
            }}
            roofEditor={{
              footprint: null,
              vertexConstraints: [],
              selectedVertexIndex: null,
              selectedEdgeIndex: null,
              onSetVertex: vi.fn(),
              onSetEdge: vi.fn(),
              onClearVertex: vi.fn(),
              onClearEdge: vi.fn(),
              onConstraintLimitExceeded: vi.fn(),
            }}
            obstaclePanel={{
              obstacles: [],
              activeObstacle: null,
              selectedObstacleIds: [],
              onSelectObstacle: vi.fn(),
              onSetActiveObstacleKind: vi.fn(),
              onSetActiveObstacleHeight: vi.fn(),
              onDeleteActiveObstacle: vi.fn(),
            }}
            statusPanel={{
              warnings: [],
              basePitchDeg: null,
              pitchAdjustmentPercent: 0,
              adjustedPitchDeg: null,
              onSetPitchAdjustmentPercent: vi.fn(),
              azimuthDeg: null,
              roofAreaM2: null,
              minHeightM: null,
              maxHeightM: null,
              fitRmsErrorM: null,
              activeFootprintLatDeg: null,
              activeFootprintLonDeg: null,
            }}
            onStartTutorial={onStartTutorial}
          />,
        )
      })
    },
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function getModeButtons(container: HTMLElement) {
  const buttons = Array.from(container.querySelectorAll('.draw-mode-button')) as HTMLButtonElement[]
  const roofModeButton = buttons.find((button) => button.textContent?.includes('Roof Mode')) ?? null
  const obstacleModeButton = buttons.find((button) => button.textContent?.includes('Obstacle Mode')) ?? null
  return { roofModeButton, obstacleModeButton }
}

describe('SunCastSidebar', () => {
  it('opens intro overlay from start tutorial button', () => {
    const view = renderSidebar()

    const trigger = view.container.querySelector('[data-testid="start-tutorial-button"]') as HTMLButtonElement | null
    expect(trigger).not.toBeNull()

    act(() => {
      trigger?.click()
    })

    const introStartButton = view.container.querySelector(
      '[data-testid="start-interactive-tutorial-button"]',
    ) as HTMLButtonElement | null
    expect(introStartButton).not.toBeNull()
    view.unmount()
  })

  it('starts interactive tutorial from intro overlay', () => {
    const view = renderSidebar()

    const trigger = view.container.querySelector('[data-testid="start-tutorial-button"]') as HTMLButtonElement
    act(() => {
      trigger.click()
    })

    const introStartButton = view.container.querySelector(
      '[data-testid="start-interactive-tutorial-button"]',
    ) as HTMLButtonElement
    act(() => {
      introStartButton.click()
    })

    expect(view.onStartTutorial).toHaveBeenCalledTimes(1)
    expect(view.container.querySelector('[data-testid="start-interactive-tutorial-button"]')).toBeNull()
    view.unmount()
  })

  it('switches rendered panels with the provided edit mode', () => {
    const view = renderSidebar()

    const { roofModeButton, obstacleModeButton } = getModeButtons(view.container)
    expect(roofModeButton?.classList.contains('draw-mode-button-active')).toBe(true)
    expect(obstacleModeButton?.classList.contains('draw-mode-button-active')).toBe(false)
    expect(view.container.querySelector('[data-testid="footprint-panel"]')).not.toBeNull()
    expect(view.container.querySelector('[data-testid="roof-editor-panel"]')).not.toBeNull()
    expect(view.container.querySelector('[data-testid="obstacle-panel"]')).toBeNull()

    view.rerender('obstacle')

    const afterRerenderButtons = getModeButtons(view.container)
    expect(afterRerenderButtons.roofModeButton?.classList.contains('draw-mode-button-active')).toBe(false)
    expect(afterRerenderButtons.obstacleModeButton?.classList.contains('draw-mode-button-active')).toBe(true)
    expect(view.container.querySelector('[data-testid="footprint-panel"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="roof-editor-panel"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="obstacle-panel"]')).not.toBeNull()
    view.unmount()
  })
})
