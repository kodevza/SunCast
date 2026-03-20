// @vitest-environment jsdom
import { act, StrictMode, useEffect } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadStorage = vi.fn()
const mockWriteStorage = vi.fn()
const mockReadSharedStateFromHashResult = vi.fn()

vi.mock('../../state/project-store/projectState.storage', () => ({
  readStorageResult: (...args: unknown[]) => mockReadStorage(...args),
  writeStorage: (...args: unknown[]) => mockWriteStorage(...args),
}))

vi.mock('../globalServices/shareService', () => ({
  readSharedStateFromHashResult: (...args: unknown[]) => mockReadSharedStateFromHashResult(...args),
}))

import { useProjectStore } from './useProjectStore'
import { initialEditorSessionState } from '../editor-session/editorSession.types'
import type { ProjectStoreState } from './projectStore.types'

function createState(id: string): ProjectStoreState {
  return {
    footprints: {
      [id]: {
        footprint: {
          id,
          vertices: [
            [1, 1],
            [2, 1],
            [2, 2],
          ],
          kwp: 4.3,
        },
        constraints: { vertexHeights: [] },
        pitchAdjustmentPercent: 0,
      },
    },
    ...initialEditorSessionState,
    activeFootprintId: id,
    selectedFootprintIds: [id],
    drawDraft: [],
    isDrawing: false,
    obstacles: {},
    activeObstacleId: null,
    selectedObstacleIds: [],
    obstacleDrawDraft: [],
    isDrawingObstacle: false,
    sunProjection: { enabled: true, datetimeIso: null, dailyDateIso: null },
    shadingSettings: { enabled: true, gridResolutionM: 0.5 },
  }
}

function renderStore(options?: { strictMode?: boolean }) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let latest: ReturnType<typeof useProjectStore> | null = null

  function Probe() {
    const store = useProjectStore()

    useEffect(() => {
      latest = store
    }, [store])

    return null
  }

  act(() => {
    root.render(options?.strictMode ? <StrictMode><Probe /></StrictMode> : <Probe />)
  })

  return {
    get: () => {
      if (!latest) {
        throw new Error('store not rendered')
      }
      return latest
    },
    waitForHydrate: async () => {
      await act(async () => {
        await Promise.resolve()
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

describe('useProjectStore startup hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('prefers hash c URL payload over localStorage', async () => {
    const shared = createState('shared')
    mockReadSharedStateFromHashResult.mockResolvedValue({ ok: true, value: shared })
    mockReadStorage.mockReturnValue({ ok: true, value: createState('stored') })

    window.history.replaceState({}, '', '/#c=abc')
    const hook = renderStore()
    await hook.waitForHydrate()

    expect(hook.get().state.activeFootprintId).toBeNull()
    expect(mockReadStorage).not.toHaveBeenCalled()
    hook.unmount()
  })

  it('does not fall back to localStorage when hash c is invalid', async () => {
    mockReadSharedStateFromHashResult.mockResolvedValue({
      ok: false,
      error: { code: 'SHARE_PAYLOAD_INVALID', message: 'Invalid shared URL payload.' },
    })
    mockReadStorage.mockReturnValue({ ok: true, value: createState('stored') })

    window.history.replaceState({}, '', '/#c=broken')
    const hook = renderStore()
    await hook.waitForHydrate()

    expect(hook.get().state.activeFootprintId).toBeNull()
    expect(hook.get().state.footprints).toEqual({})
    expect(mockReadStorage).not.toHaveBeenCalled()
    hook.unmount()
  })

  it('exposes resetState command that clears project data', async () => {
    mockReadSharedStateFromHashResult.mockResolvedValue({ ok: true, value: createState('shared') })
    mockReadStorage.mockReturnValue({ ok: true, value: null })

    window.history.replaceState({}, '', '/#c=abc')
    const hook = renderStore()
    await hook.waitForHydrate()
    expect(hook.get().state.activeFootprintId).toBeNull()

    act(() => {
      hook.get().resetState()
    })

    expect(hook.get().state.activeFootprintId).toBeNull()
    expect(Object.keys(hook.get().state.footprints)).toHaveLength(0)
    expect(hook.get().state.obstacles).toEqual({})
    hook.unmount()
  })

  it('commits the current roof draft through the store bridge', async () => {
    mockReadSharedStateFromHashResult.mockResolvedValue({ ok: true, value: null })
    mockReadStorage.mockReturnValue({ ok: true, value: null })

    const hook = renderStore()
    await hook.waitForHydrate()

    act(() => {
      hook.get().startDrawing()
      hook.get().addDraftPoint([0, 0])
      hook.get().addDraftPoint([1, 0])
      hook.get().addDraftPoint([1, 1])
    })

    act(() => {
      hook.get().commitFootprint()
    })

    const footprintIds = Object.keys(hook.get().state.footprints)
    expect(footprintIds).toHaveLength(1)
    expect(hook.get().state.activeFootprintId).toBe(footprintIds[0])
    expect(hook.get().state.selectedFootprintIds).toEqual([footprintIds[0]])
    expect(hook.get().state.drawDraft).toEqual([])
    hook.unmount()
  })

  it('updates the active footprint kwp through the current selection', async () => {
    const stored = createState('a')
    stored.footprints.b = {
      footprint: {
        id: 'b',
        vertices: [
          [3, 3],
          [4, 3],
          [4, 4],
        ],
        kwp: 5,
      },
      constraints: { vertexHeights: [] },
      pitchAdjustmentPercent: 0,
    }
    stored.selectedFootprintIds = ['a']

    mockReadSharedStateFromHashResult.mockResolvedValue({ ok: false, error: { code: 'SHARE_PAYLOAD_INVALID', message: 'Invalid shared URL payload.' } })
    mockReadStorage.mockReturnValue({ ok: true, value: stored })

    const hook = renderStore()
    await hook.waitForHydrate()

    act(() => {
      hook.get().selectOnlyFootprint('b')
    })

    act(() => {
      hook.get().setActiveFootprintKwp(7.2)
    })

    expect(hook.get().state.footprints.b.footprint.kwp).toBe(7.2)
    expect(hook.get().state.footprints.a.footprint.kwp).toBe(4.3)
    hook.unmount()
  })

  it('derives the active footprint from editor-session active selection', async () => {
    const stored = createState('a')
    stored.footprints.b = {
      footprint: {
        id: 'b',
        vertices: [
          [3, 3],
          [4, 3],
          [4, 4],
        ],
        kwp: 5,
      },
      constraints: { vertexHeights: [] },
      pitchAdjustmentPercent: 0,
    }
    stored.selectedFootprintIds = ['a']

    mockReadSharedStateFromHashResult.mockResolvedValue({ ok: false, error: { code: 'SHARE_PAYLOAD_INVALID', message: 'Invalid shared URL payload.' } })
    mockReadStorage.mockReturnValue({ ok: true, value: stored })

    const hook = renderStore()
    await hook.waitForHydrate()

    act(() => {
      hook.get().selectOnlyFootprint('a')
    })

    act(() => {
      hook.get().setActiveFootprint('b')
    })

    expect(hook.get().activeFootprint?.id).toBe('b')
    expect(hook.get().selectedFootprintIds).toEqual(['a'])
    hook.unmount()
  })

  it('persists canonical document state with null active ids', async () => {
    const shared = createState('shared')
    shared.footprints.another = {
      footprint: {
        id: 'another',
        vertices: [
          [3, 3],
          [4, 3],
          [4, 4],
        ],
        kwp: 5,
      },
      constraints: { vertexHeights: [] },
      pitchAdjustmentPercent: 0,
    }
    shared.selectedFootprintIds = ['shared', 'another']
    mockReadSharedStateFromHashResult.mockResolvedValue({ ok: true, value: shared })
    mockReadStorage.mockReturnValue({ ok: true, value: null })

    window.history.replaceState({}, '', '/#c=abc')
    const hook = renderStore()
    await hook.waitForHydrate()

    const writeCallsBeforeSelection = mockWriteStorage.mock.calls.length

    act(() => {
      hook.get().selectOnlyFootprint('another')
    })

    expect(mockWriteStorage).toHaveBeenCalled()
    const latestCall = mockWriteStorage.mock.calls.at(-1)
    expect(latestCall?.[0]).toMatchObject({
      footprints: expect.any(Object),
      obstacles: expect.any(Object),
      sunProjection: expect.any(Object),
      shadingSettings: expect.any(Object),
    })
    expect(latestCall?.[0].drawDraft).toBeUndefined()
    expect(latestCall?.[0].selectedFootprintIds).toBeUndefined()
    expect(mockWriteStorage.mock.calls).toHaveLength(writeCallsBeforeSelection)
    hook.unmount()
  })

  it('increments stateRevision only for geometry-affecting updates', async () => {
    const stored = createState('a')
    stored.footprints.b = {
      footprint: {
        id: 'b',
        vertices: [
          [3, 3],
          [4, 3],
          [4, 4],
        ],
        kwp: 5,
      },
      constraints: { vertexHeights: [] },
      pitchAdjustmentPercent: 0,
    }
    stored.selectedFootprintIds = ['a', 'b']

    mockReadSharedStateFromHashResult.mockResolvedValue({
      ok: false,
      error: { code: 'SHARE_PAYLOAD_INVALID', message: 'Invalid shared URL payload.' },
    })
    mockReadStorage.mockReturnValue({ ok: true, value: stored })

    const hook = renderStore()
    await hook.waitForHydrate()

    const afterHydrationRevision = hook.get().stateRevision

    act(() => {
      hook.get().selectOnlyFootprint('b')
    })

    expect(hook.get().stateRevision).toBe(afterHydrationRevision)

    act(() => {
      hook.get().moveFootprintVertex('a', 0, [3.1, 3.1])
    })

    expect(hook.get().stateRevision).toBe(afterHydrationRevision + 1)
    hook.unmount()
  })

  it('loads from storage in StrictMode without persisting an empty state first', async () => {
    mockReadSharedStateFromHashResult.mockResolvedValue({ ok: true, value: null })
    mockReadStorage.mockReturnValue({ ok: true, value: createState('stored') })

    const hook = renderStore({ strictMode: true })
    await hook.waitForHydrate()

    expect(mockReadSharedStateFromHashResult).not.toHaveBeenCalled()
    expect(mockWriteStorage).toHaveBeenCalled()
    expect(
      mockWriteStorage.mock.calls.some(([payload]) => Object.keys(payload.footprints).length === 0),
    ).toBe(false)
    hook.unmount()
  })
})
