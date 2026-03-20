import { useMemo } from 'react'
import { useAnalysis } from '../analysis/useAnalysis'
import type { FootprintStateEntry } from '../../state/project-store/projectState.types'
import { useEditModeState } from '../editor-session/useEditModeState'
import { useGeometryEditing } from '../editor-session/useGeometryEditing'
import { useGeometrySelectionState } from '../editor-session/useGeometrySelectionState'
import { TutorialController } from '../features/tutorial/TutorialController'
import { useTutorialControllerModel } from '../features/tutorial/useTutorialControllerModel'
import { useTutorialState } from '../features/tutorial/useTutorialState'
import { useDrawToolsController } from '../features/map-editor/DrawTools/hooks/useDrawToolsController'
import { useMapViewController } from '../features/map-editor/MapView/useMapViewController'
import { useMapViewRuntime } from '../features/map-editor/MapView/useMapViewRuntime'
import { useFootprintPanelController } from '../features/sidebar/useFootprintPanelController'
import { useObstaclePanelController } from '../features/sidebar/useObstaclePanelController'
import { useRoofEditorController } from '../features/sidebar/useRoofEditorController'
import { useStatusPanelController } from '../features/sidebar/useStatusPanelController'
import { useObstacleMeshResults } from '../hooks/useObstacleMeshResults'
import { useProjectStore } from '../project-store/useProjectStore'
import { SunCastCanvas } from './SunCastCanvas'
import { SunCastEffects } from './SunCastEffects'
import { SunCastLayout } from './SunCastLayout'
import { SunCastSidebar } from './SunCastSidebar'
import { useSunToolsController } from '../features/sun-tools/useSunToolsController'

export function SunCastScreen() {
  const project = useProjectStore()
  const mapView = useMapViewRuntime()
  const editMode = useEditModeState()
  const tutorial = useTutorialState()
  const rawGeometrySelection = useGeometrySelectionState({
    activeFootprint: project.activeFootprint,
    isDrawing: project.state.isDrawing || project.state.isDrawingObstacle,
  })

  const geometryEditing = useGeometryEditing({
    activeFootprint: project.activeFootprint,
    activeConstraints: project.activeConstraints,
    isDrawing: project.state.isDrawing || project.state.isDrawingObstacle,
    selection: rawGeometrySelection,
    moveFootprintVertex: project.moveFootprintVertex,
    moveFootprintEdge: project.moveFootprintEdge,
    setVertexHeight: project.setFootprintVertexHeight,
    setVertexHeights: project.setFootprintVertexHeights,
    setEdgeHeight: project.setFootprintEdgeHeight,
  })

  const geometrySelection = useMemo(
    () => ({
      ...rawGeometrySelection,
      clearSelectionState: () => {
        rawGeometrySelection.clearSelectionState()
        geometryEditing.clearInteractionError()
      },
      selectVertex: (vertexIndex: number) => {
        rawGeometrySelection.selectVertex(vertexIndex)
        geometryEditing.clearInteractionError()
      },
      selectEdge: (edgeIndex: number) => {
        rawGeometrySelection.selectEdge(edgeIndex)
        geometryEditing.clearInteractionError()
      },
    }),
    [geometryEditing, rawGeometrySelection],
  )

  const footprintEntries = useMemo(
    () => Object.values(project.state.footprints) as FootprintStateEntry[],
    [project.state.footprints],
  )

  const analysis = useAnalysis({
    stateRevision: project.stateRevision,
    footprintEntries,
    footprintEntriesById: project.state.footprints,
    activeFootprintId: project.state.activeFootprintId,
    selectedFootprintIds: project.selectedFootprintIds,
    activeFootprintVertices: project.activeFootprint?.vertices ?? null,
    obstacles: project.obstacles,
    sunProjection: project.projectDocument.sunProjection,
    shadingSettings: project.projectDocument.shadingSettings,
    hasVertexOrEdgeSelection:
      geometrySelection.safeSelectedVertexIndex !== null || geometrySelection.safeSelectedEdgeIndex !== null,
    isGeometryDragActive: geometryEditing.isGeometryDragActive,
    setSunProjectionDatetimeIso: project.setSunProjectionDatetimeIso,
    setSunProjectionDailyDateIso: project.setSunProjectionDailyDateIso,
  })

  const obstacleMeshResults = useObstacleMeshResults(project.obstacles).obstacleMeshResults



  const drawTools = useDrawToolsController({ project, mapView, editMode, geometrySelection })
  const footprintPanel = useFootprintPanelController({ project, tutorial, geometrySelection })
  const roofEditor = useRoofEditorController({
    project,
    geometrySelection,
    geometryEditing,
  })
  const obstaclePanel = useObstaclePanelController({ project, geometrySelection })
  const statusPanel = useStatusPanelController({ project, analysis, tutorial, geometrySelection })
  const mapViewController = useMapViewController({
    project,
    mapView,
    analysis,
    obstacleMeshResults,
    editMode,
    geometrySelection,
    geometryEditing,
  })
  const sunTools = useSunToolsController({ project, analysis, tutorial })
  const tutorialController = useTutorialControllerModel({ project, mapView, tutorial })

  return (
    <>
      <SunCastEffects
        project={project}
        geometrySelection={geometrySelection}
        geometryEditing={geometryEditing}
        analysis={analysis}
        obstacleMeshResults={obstacleMeshResults}
      />
      <SunCastLayout>
        <SunCastSidebar
          drawTools={drawTools}
          footprintPanel={footprintPanel}
          roofEditor={roofEditor}
          obstaclePanel={obstaclePanel}
          statusPanel={statusPanel}
          onStartTutorial={() => tutorial.tutorialStartRef.current()}
        />
        <SunCastCanvas mapView={mapViewController} sunTools={sunTools} />
        <TutorialController model={tutorialController} />
      </SunCastLayout>
    </>
  )
}
