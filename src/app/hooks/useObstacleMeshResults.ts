import { useMemo } from 'react'
import { generateObstacleMeshResult } from '../../geometry/mesh/generateObstacleMesh'
import type { ObstacleStateEntry } from '../../types/geometry'

export function useObstacleMeshResults(obstacles: ObstacleStateEntry[]) {
  const obstacleMeshResults = useMemo(() => {
    return obstacles.map((obstacle) => generateObstacleMeshResult(obstacle))
  }, [obstacles])

  const obstacleMeshes = useMemo(
    () => obstacleMeshResults.filter((result): result is Extract<typeof result, { ok: true }> => result.ok),
    [obstacleMeshResults],
  )

  return {
    obstacleMeshResults,
    obstacleMeshes,
  }
}
