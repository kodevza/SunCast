import { useMemo } from 'react'
import { useMapNavigationTarget } from './useMapNavigationTarget'
import { useShareProject } from './useShareProject'
import type { ReturnTypeUseProjectDocument } from './hookReturnTypes'

export interface SunCastCommands {
  mapNavigationTarget: ReturnType<typeof useMapNavigationTarget>['mapNavigationTarget']
  onPlaceSearchSelect: ReturnType<typeof useMapNavigationTarget>['onPlaceSearchSelect']
  onShareProject: () => Promise<void>
}

export function useSunCastCommands(projectDocument: ReturnTypeUseProjectDocument): SunCastCommands {
  const store = projectDocument

  const { onShareProject } = useShareProject({
    footprints: store.state.footprints,
    activeFootprintId: null,
    obstacles: store.state.obstacles,
    activeObstacleId: null,
    sunProjection: store.state.sunProjection,
  })

  const { mapNavigationTarget, onPlaceSearchSelect } = useMapNavigationTarget()

  return useMemo(
    () => ({
      mapNavigationTarget,
      onPlaceSearchSelect,
      onShareProject,
    }),
    [mapNavigationTarget, onPlaceSearchSelect, onShareProject],
  )
}
