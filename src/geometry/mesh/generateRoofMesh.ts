import earcut from 'earcut'
import type { FootprintPolygon, RoofMeshData } from '../../types/geometry'

export function generateRoofMesh(footprint: FootprintPolygon, vertexHeightsM: number[]): RoofMeshData {
  if (footprint.vertices.length !== vertexHeightsM.length) {
    throw new Error('Footprint vertices and roof vertex heights must have equal length')
  }

  const flatCoords = footprint.vertices.flatMap((v) => v)
  const indices = earcut(flatCoords)

  return {
    vertices: footprint.vertices.map(([lon, lat], idx) => ({
      lon,
      lat,
      z: vertexHeightsM[idx],
    })),
    triangleIndices: indices,
  }
}
