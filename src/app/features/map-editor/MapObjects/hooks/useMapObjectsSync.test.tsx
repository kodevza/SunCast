// @vitest-environment jsdom
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { createRoot } from 'react-dom/client'
import { createRef, useEffect, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type maplibregl from 'maplibre-gl'
import { useMapObjectsSync } from './useMapObjectsSync'

const worldMeshLayerSpies = vi.hoisted(() => ({
  setGeometry: vi.fn(),
  setZExaggeration: vi.fn(),
  setVisible: vi.fn(),
}))

const shadeLayerSpies = vi.hoisted(() => ({
  setRoofMeshes: vi.fn(),
  setShadeResult: vi.fn(),
  setZExaggeration: vi.fn(),
  setVisible: vi.fn(),
}))

vi.mock('../layers/MapObjectMeshLayer', () => ({
  WorldMeshLayer: class WorldMeshLayer {
    id: string

    constructor(id = 'world-mesh-layer') {
      this.id = id
    }

    setGeometry = worldMeshLayerSpies.setGeometry
    setZExaggeration = worldMeshLayerSpies.setZExaggeration
    setVisible = worldMeshLayerSpies.setVisible
  },
}))

vi.mock('../layers/ProjectedBinaryShadeLayer', () => ({
  ProjectedBinaryShadeLayer: class ProjectedBinaryShadeLayer {
    id: string

    constructor(id = 'roof-shaded-cells-layer') {
      this.id = id
    }

    setRoofMeshes = shadeLayerSpies.setRoofMeshes
    setShadeResult = shadeLayerSpies.setShadeResult
    setZExaggeration = shadeLayerSpies.setZExaggeration
    setVisible = shadeLayerSpies.setVisible
  },
}))

type UseMapObjectsSyncArgs = Parameters<typeof useMapObjectsSync>[0]

function createMapMock(): {
  map: Partial<maplibregl.Map>
  addLayer: ReturnType<typeof vi.fn>
} {
  const addLayer = vi.fn()

  return {
    map: {
      addLayer,
      getLayer: vi.fn(() => true),
      removeLayer: vi.fn(),
    } as unknown as Partial<maplibregl.Map>,
    addLayer,
  }
}

function renderHook(initialArgs: UseMapObjectsSyncArgs) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const argsRef: { current: UseMapObjectsSyncArgs } = { current: initialArgs }

  function Probe({ args }: { args: UseMapObjectsSyncArgs }) {
    useMapObjectsSync(args)
    const sharedRef = useRef(argsRef)
    useEffect(() => {
      sharedRef.current.current = args
    }, [args, sharedRef])
    return null
  }

  const rerender = (nextArgs?: UseMapObjectsSyncArgs) => {
    if (nextArgs) {
      argsRef.current = nextArgs
    }
    act(() => {
      root.render(<Probe args={argsRef.current} />)
    })
  }

  rerender(initialArgs)

  return {
    rerender,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('useMapObjectsSync', () => {
  it('adds the projected shaded-cell layer after the roof layer and turns it on in orbit', () => {
    const { map, addLayer } = createMapMock()
    const mapRef = createRef<maplibregl.Map | null>()
    mapRef.current = map as maplibregl.Map

    const hook = renderHook({
      mapRef,
      mapLoaded: true,
      roofMeshes: [],
      obstacleMeshes: [],
      shadingMode: 'live-shading',
      shadingCells: [],
      shadingResult: null,
      orbitEnabled: true,
      meshesVisible: true,
      shadingEnabled: true,
      shadingComputeState: 'READY',
    })

    expect(addLayer.mock.calls.map(([layer]) => (layer as { id: string }).id)).toEqual([
      'roof-mesh-layer',
      'obstacle-mesh-layer',
      'roof-shaded-cells-layer',
    ])
    expect(shadeLayerSpies.setRoofMeshes).toHaveBeenCalled()
    expect(shadeLayerSpies.setShadeResult).toHaveBeenCalled()
    expect(shadeLayerSpies.setVisible).toHaveBeenCalledWith(true)

    hook.unmount()
  })
})
