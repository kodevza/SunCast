import { useMapNavigationTarget } from './useMapNavigationTarget'
import { useShareProject } from './useShareProject'
import type { ReturnTypeUseProjectDocument } from './hookReturnTypes'

export function useSunCastRuntimeActions(projectDocument: ReturnTypeUseProjectDocument) {
  const { store } = projectDocument

  const { onShareProject } = useShareProject({
    footprints: store.state.footprints,
    activeFootprintId: null,
    obstacles: store.state.obstacles,
    activeObstacleId: null,
    sunProjection: store.state.sunProjection,
  })

  const { mapNavigationTarget, onPlaceSearchSelect } = useMapNavigationTarget()

  return {
    mapNavigationTarget,
    onPlaceSearchSelect,
    onShareProject,
  }
}
