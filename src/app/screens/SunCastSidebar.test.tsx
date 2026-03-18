// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SunCastAppProvider } from './SunCastAppProvider'
import { SunCastSidebar } from './SunCastSidebar'

vi.mock('../features/sidebar/FootprintPanel', () => ({ FootprintPanel: () => <div data-testid="footprint-panel" /> }))
vi.mock('../features/sidebar/RoofEditor', () => ({ RoofEditor: () => <div data-testid="roof-editor-panel" /> }))
vi.mock('../features/sidebar/ObstaclePanel', () => ({ ObstaclePanel: () => <div data-testid="obstacle-panel" /> }))
vi.mock('../features/sidebar/StatusPanel', () => ({ StatusPanel: () => null }))

const mockUseAnalysis = vi.fn()
const mockUseObstacleMeshResults = vi.fn()
const mockUseSunCastCommands = vi.fn()

vi.mock('../analysis/useAnalysis', () => ({
  useAnalysis: (...args: unknown[]) => mockUseAnalysis(...args),
}))

vi.mock('../hooks/useObstacleMeshResults', () => ({
  useObstacleMeshResults: (...args: unknown[]) => mockUseObstacleMeshResults(...args),
}))

vi.mock('../hooks/useSunCastCommands', () => ({
  useSunCastCommands: (...args: unknown[]) => mockUseSunCastCommands(...args),
}))

function renderSidebar() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      <SunCastAppProvider>
        <SunCastSidebar />
      </SunCastAppProvider>,
    )
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

function getModeButtons(container: HTMLElement) {
  const buttons = Array.from(container.querySelectorAll('.draw-mode-button')) as HTMLButtonElement[]
  const roofModeButton = buttons.find((button) => button.textContent?.includes('Roof Mode')) ?? null
  const obstacleModeButton = buttons.find((button) => button.textContent?.includes('Obstacle Mode')) ?? null
  return { roofModeButton, obstacleModeButton }
}

describe('SunCastSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAnalysis.mockReturnValue({
      solvedMetrics: {
        basePitchDeg: null,
        azimuthDeg: null,
        roofAreaM2: null,
        minHeightM: null,
        maxHeightM: null,
        fitRmsErrorM: null,
      },
      solvedRoofs: {
        activeSolved: null,
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

    expect(view.container.querySelector('[data-testid="start-interactive-tutorial-button"]')).toBeNull()
    view.unmount()
  })

  it('switches edit mode from tab clicks', () => {
    const view = renderSidebar()

    const { roofModeButton, obstacleModeButton } = getModeButtons(view.container)
    expect(roofModeButton?.classList.contains('draw-mode-button-active')).toBe(true)
    expect(obstacleModeButton?.classList.contains('draw-mode-button-active')).toBe(false)
    expect(view.container.querySelector('[data-testid="footprint-panel"]')).not.toBeNull()
    expect(view.container.querySelector('[data-testid="roof-editor-panel"]')).not.toBeNull()
    expect(view.container.querySelector('[data-testid="obstacle-panel"]')).toBeNull()

    act(() => {
      obstacleModeButton?.click()
    })

    const afterClickButtons = getModeButtons(view.container)
    expect(afterClickButtons.roofModeButton?.classList.contains('draw-mode-button-active')).toBe(false)
    expect(afterClickButtons.obstacleModeButton?.classList.contains('draw-mode-button-active')).toBe(true)
    expect(view.container.querySelector('[data-testid="footprint-panel"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="roof-editor-panel"]')).toBeNull()
    expect(view.container.querySelector('[data-testid="obstacle-panel"]')).not.toBeNull()
    view.unmount()
  })
})
