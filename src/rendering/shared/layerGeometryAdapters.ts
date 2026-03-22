import type { ObstacleMeshData, RoofMeshData } from '../../types/geometry'
import { buildWorldMeshGeometry, type WorldMeshGeometry } from './meshWorldGeometry'

export function buildRoofLayerGeometry(meshes: RoofMeshData[], zExaggeration: number): WorldMeshGeometry[] {
  return meshes.flatMap((mesh) => {
    const geometry = buildWorldMeshGeometry(mesh, zExaggeration)
    return geometry ? [geometry] : []
  })
}

export function buildObstacleLayerGeometry(meshes: ObstacleMeshData[], zExaggeration: number): WorldMeshGeometry[] {
  return meshes.flatMap((mesh) => {
    const geometry = buildWorldMeshGeometry(mesh, zExaggeration)
    return geometry ? [geometry] : []
  })
}
