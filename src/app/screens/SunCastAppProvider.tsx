/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { useAnalysis } from '../analysis/useAnalysis'
import type { FootprintStateEntry } from '../../state/project-store/projectState.types'
import { useEditorSession } from '../editor-session/useEditorSession'
import { useObstacleMeshResults } from '../hooks/useObstacleMeshResults'
import { useSunCastCommands } from '../hooks/useSunCastCommands'
import { useProjectStore } from '../project-store/useProjectStore'

export interface SunCastAppContextValue {
  project: ReturnType<typeof useProjectStore>
  session: ReturnType<typeof useEditorSession>
  analysis: ReturnType<typeof useAnalysis>
  obstacleMeshResults: ReturnType<typeof useObstacleMeshResults>['obstacleMeshResults']
  commands: ReturnType<typeof useSunCastCommands>
}

const SunCastAppContext = createContext<SunCastAppContextValue | null>(null)

export function SunCastAppProvider({ children }: { children: ReactNode }) {
  const project = useProjectStore()
  const obstacleMeshResults = useObstacleMeshResults(project.obstacles)
  const session = useEditorSession({
    activeFootprint: project.activeFootprint,
    activeConstraints: project.activeConstraints,
    isDrawing: project.state.isDrawing,
    isDrawingObstacle: project.state.isDrawingObstacle,
    moveVertex: project.moveVertex,
    moveEdge: project.moveEdge,
    setVertexHeight: project.setVertexHeight,
    setVertexHeights: project.setVertexHeights,
    setEdgeHeight: project.setEdgeHeight,
  })

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
      session.safeSelectedVertexIndex !== null || session.safeSelectedEdgeIndex !== null,
    isGeometryDragActive: session.isGeometryDragActive,
    setSunProjectionDatetimeIso: project.setSunProjectionDatetimeIso,
    setSunProjectionDailyDateIso: project.setSunProjectionDailyDateIso,
  })

  const commands = useSunCastCommands(project)

  const value = useMemo(
    () => ({
      project,
      session,
      analysis,
      obstacleMeshResults: obstacleMeshResults.obstacleMeshResults,
      commands,
    }),
    [analysis, commands, obstacleMeshResults.obstacleMeshResults, project, session],
  )

  return <SunCastAppContext.Provider value={value}>{children}</SunCastAppContext.Provider>
}

export function useSunCastAppContext(): SunCastAppContextValue {
  const context = useContext(SunCastAppContext)
  if (!context) {
    throw new Error('useSunCastAppContext must be used within SunCastAppProvider')
  }
  return context
}
