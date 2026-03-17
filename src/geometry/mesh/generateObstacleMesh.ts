import type { ObstacleStateEntry, RoofMeshData } from '../../types/geometry'
import { createAppError, err, ok, type AppError, type Result } from '../../shared/errors'
import { generateRoofMesh } from './generateRoofMesh'
import { cylinderToPolygon, toVisualObstacleModel } from '../obstacles/obstacleModels'

const DEFAULT_OBSTACLE_KWP = 0



export function generateObstacleMesh(obstacle: ObstacleStateEntry): RoofMeshData | null {
  const result = generateObstacleMeshResult(obstacle)
  return result.ok ? result.value : null
}

export function generateObstacleMeshResult(obstacle: ObstacleStateEntry): Result<RoofMeshData, AppError> {
  const visualObstacle = toVisualObstacleModel(obstacle)
  const polygon =
    visualObstacle.shape === 'prism'
      ? visualObstacle.polygon
      : visualObstacle.shape === 'cylinder'
        ? cylinderToPolygon(visualObstacle.center, visualObstacle.radiusM)
        : cylinderToPolygon(visualObstacle.center, visualObstacle.crownRadiusM)
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return err(
      createAppError('GEOMETRY_BUILD_FAILED', 'Obstacle footprint is invalid.', {
        context: { obstacleId: obstacle.id, shape: visualObstacle.shape, reason: 'polygon-too-small' },
      }),
    )
  }

  try {
    return ok(
      generateRoofMesh(
      {
        id: obstacle.id,
        vertices: polygon,
        kwp: DEFAULT_OBSTACLE_KWP,
      },
      polygon.map(() => visualObstacle.heightAboveGroundM),
      ),
    )
  } catch (cause) {
    return err(
      createAppError('GEOMETRY_BUILD_FAILED', 'Obstacle mesh generation failed.', {
        cause,
        context: {
          obstacleId: obstacle.id,
          shape: visualObstacle.shape,
          heightAboveGroundM: visualObstacle.heightAboveGroundM,
        },
      }),
    )
  }
}
