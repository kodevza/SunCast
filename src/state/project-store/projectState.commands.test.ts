import { describe, expect, it, vi } from 'vitest'
import { createProjectCommands } from './projectState.commands'
import type { ObstacleStateEntry } from '../../types/geometry'

function createState(): {
  footprints: Record<
    string,
    {
      footprint: {
        id: string
        vertices: Array<[number, number]>
        kwp: number
      }
      constraints: {
        vertexHeights: Array<{ vertexIndex: number; heightM: number }>
      }
    }
  >
  obstacles: Record<string, ObstacleStateEntry>
} {
  return {
    footprints: {
      fp1: {
        footprint: {
          id: 'fp1',
          vertices: [
            [0, 0],
            [1, 0],
            [1, 1],
          ] as Array<[number, number]>,
          kwp: 4.3,
        },
        constraints: {
          vertexHeights: [{ vertexIndex: 0, heightM: 2 }],
        },
      },
    },
    obstacles: {
      ob1: {
        id: 'ob1',
        kind: 'building',
        shape: {
          type: 'polygon-prism',
          polygon: [
            [0, 0],
            [1, 0],
            [1, 1],
          ] as Array<[number, number]>,
        },
        heightAboveGroundM: 8,
      },
      ob2: {
        id: 'ob2',
        kind: 'tree',
        shape: {
          type: 'tree',
          center: [2, 2],
          crownRadiusM: 1.5,
          trunkRadiusM: 0.4,
        },
        heightAboveGroundM: 5,
      },
    },
  }
}

describe('createProjectCommands footprint height mutations', () => {
  it('updates a single vertex height for the given footprint id', () => {
    const dispatch = vi.fn()
    const commands = createProjectCommands(dispatch, createState)

    const applied = commands.setFootprintVertexHeight('fp1', 1, 3.5)

    expect(applied).toBe(true)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_FOOTPRINT_VERTEX_HEIGHTS',
      payload: {
        footprintId: 'fp1',
        constraints: [
          { vertexIndex: 0, heightM: 2 },
          { vertexIndex: 1, heightM: 3.5 },
        ],
      },
    })
  })

  it('updates both vertices of a footprint edge', () => {
    const dispatch = vi.fn()
    const commands = createProjectCommands(dispatch, createState)

    const applied = commands.setFootprintEdgeHeight('fp1', 1, 4.2)

    expect(applied).toBe(true)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_FOOTPRINT_VERTEX_HEIGHTS',
      payload: {
        footprintId: 'fp1',
        constraints: [
          { vertexIndex: 0, heightM: 2 },
          { vertexIndex: 1, heightM: 4.2 },
          { vertexIndex: 2, heightM: 4.2 },
        ],
      },
    })
  })

  it('rejects missing footprints without dispatching', () => {
    const dispatch = vi.fn()
    const commands = createProjectCommands(dispatch, createState)

    const applied = commands.setFootprintVertexHeight('missing', 0, 1.5)

    expect(applied).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('rejects invalid obstacle vertex moves without dispatching', () => {
    const dispatch = vi.fn()
    const commands = createProjectCommands(dispatch, createState)

    expect(commands.moveObstacleVertex('missing', 0, [3, 3])).toBe(false)
    expect(commands.moveObstacleVertex('ob2', 0, [3, 3])).toBe(false)
    expect(commands.moveObstacleVertex('ob1', -1, [3, 3])).toBe(false)
    expect(commands.moveObstacleVertex('ob1', 3, [3, 3])).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })
})
