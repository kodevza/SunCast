import { describe, expect, it } from 'vitest'
import type { RoofMeshData } from '../../types/geometry'
import { buildDebugOverlayGeometry } from './debugOverlayGeometry'

describe('buildDebugOverlayGeometry', () => {
  it('produces top-face fill triangles plus loop and stem vertices in world 3D coordinates', () => {
    const mesh: RoofMeshData = {
      vertices: [
        { lon: -122.421, lat: 37.772, z: 2 },
        { lon: -122.418, lat: 37.772, z: 4 },
        { lon: -122.418, lat: 37.775, z: 7.5 },
        { lon: -122.421, lat: 37.775, z: 3 },
      ],
      triangleIndices: [0, 1, 2, 0, 2, 3],
    }

    const geometry = buildDebugOverlayGeometry([mesh], 1)

    expect(geometry.loopsPerMesh).toEqual([4])
    expect(geometry.loopCoords.length).toBe(12)
    expect(geometry.stemCoords.length).toBe(24)
    expect(geometry.fillCoords.length).toBe(18)
    expect(geometry.loopVertexCount).toBe(4)
    expect(geometry.stemVertexCount).toBe(8)
    expect(geometry.fillVertexCount).toBe(6)
  })

  it('returns zero geometry for empty mesh input', () => {
    const geometry = buildDebugOverlayGeometry([], 1)

    expect(geometry.loopsPerMesh).toEqual([])
    expect(geometry.loopCoords).toEqual([])
    expect(geometry.stemCoords).toEqual([])
    expect(geometry.fillCoords).toEqual([])
    expect(geometry.loopVertexCount).toBe(0)
    expect(geometry.stemVertexCount).toBe(0)
    expect(geometry.fillVertexCount).toBe(0)
  })

  it('skips degenerate meshes where the top loop collapses to a line', () => {
    const degenerateMesh: RoofMeshData = {
      vertices: [
        { lon: -122.421, lat: 37.772, z: 2 },
        { lon: -122.419, lat: 37.772, z: 4 },
        { lon: -122.417, lat: 37.772, z: 7.5 },
      ],
      triangleIndices: [0, 1, 2],
    }

    const geometry = buildDebugOverlayGeometry([degenerateMesh], 1)

    expect(geometry.loopsPerMesh).toEqual([])
    expect(geometry.loopVertexCount).toBe(0)
    expect(geometry.stemVertexCount).toBe(0)
    expect(geometry.fillVertexCount).toBe(0)
  })
})
