import { useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { FaceConstraints, FootprintPolygon, ObstacleKind, ObstacleStateEntry } from '../../../types/geometry'
import type { FootprintStateEntry } from '../../../state/project-store/projectState.types'
import type { SolvedEntry } from '../../analysis/solvedRoof.types'
import { clampPitchAdjustmentPercent } from './statusPanel.types'
import { useActiveFootprintMetrics } from './useActiveFootprintMetrics'
import type { FootprintPanelProps } from './FootprintPanel'
import type { ObstaclePanelProps } from './ObstaclePanel'
import type { RoofEditorProps } from './RoofEditor'
import type { StatusPanelProps } from './StatusPanel'

export interface SidebarFeatureContract {
  analysis: {
    solvedMetrics: {
      basePitchDeg: number | null
      azimuthDeg: number | null
      roofAreaM2: number | null
      minHeightM: number | null
      maxHeightM: number | null
      fitRmsErrorM: number | null
    }
    solvedRoofs: {
      entries: SolvedEntry[]
      activeSolved: SolvedEntry | null
      activeError: string | null
    }
  }
  geometryEditing: {
    setConstraintLimitError: () => void
  }
  geometrySelection: {
    clearSelectionState: () => void
    safeSelectedEdgeIndex: number | null
    safeSelectedVertexIndex: number | null
  }
  project: {
    activeConstraints: FaceConstraints
    activeFootprint: FootprintPolygon | null
    activeObstacle: ObstacleStateEntry | null
    clearFootprintEdgeHeight: (footprintId: string, edgeIndex: number) => void
    clearFootprintSelection: () => void
    clearFootprintVertexHeight: (footprintId: string, vertexIndex: number) => void
    clearObstacleSelection: () => void
    deleteFootprint: (footprintId: string) => void
    deleteObstacle: (obstacleId: string) => void
    obstacles: ObstacleStateEntry[]
    selectedFootprintIds: string[]
    selectOnlyFootprint: (footprintId: string) => void
    selectOnlyObstacle: (obstacleId: string) => void
    setActiveFootprintKwp: (kwp: number) => boolean
    setActivePitchAdjustmentPercent: (pitchAdjustmentPercent: number) => boolean
    setFootprintEdgeHeight: (footprintId: string, edgeIndex: number, heightM: number) => boolean
    setFootprintVertexHeight: (footprintId: string, vertexIndex: number, heightM: number) => boolean
    setObstacleHeight: (obstacleId: string, heightAboveGroundM: number) => boolean
    setObstacleKind: (obstacleId: string, kind: ObstacleKind) => boolean
    state: {
      activeFootprintId: string | null
      activeObstacleId: string | null
      footprints: Record<string, FootprintStateEntry>
      selectedObstacleIds: string[]
    }
    toggleObstacleSelection: (obstacleId: string) => void
  }
  tutorial: {
    setTutorialEditedKwpByFootprint: Dispatch<SetStateAction<Record<string, true>>>
  }
}

type SidebarFootprintPanelModel = Omit<FootprintPanelProps, 'onShareProject'>

export interface SidebarFeatureModel {
  footprintPanel: SidebarFootprintPanelModel
  roofEditor: RoofEditorProps
  obstaclePanel: ObstaclePanelProps
  statusPanel: StatusPanelProps
}

export function useSidebarControllerModel({
  analysis,
  geometryEditing,
  geometrySelection,
  project,
  tutorial,
}: SidebarFeatureContract): SidebarFeatureModel {
  const activeFootprintMetrics = useActiveFootprintMetrics({
    activeFootprint: project.activeFootprint,
    basePitchDeg: analysis.solvedMetrics.basePitchDeg,
    activePitchAdjustmentPercent: project.activeFootprint
      ? project.state.footprints[project.activeFootprint.id]?.pitchAdjustmentPercent ?? 0
      : 0,
  })

  const footprintPanel = useMemo<SidebarFootprintPanelModel>(
    () => ({
      footprints: Object.values(project.state.footprints).map((entry) => entry.footprint),
      activeFootprintId: project.state.activeFootprintId,
      selectedFootprintIds: project.selectedFootprintIds,
      activeFootprintKwp: project.activeFootprint?.kwp ?? null,
      onSelectFootprint: (footprintId: string, multiSelect: boolean) => {
        if (multiSelect) {
          console.error('not implemented')
        } else {
          project.selectOnlyFootprint(footprintId)
        }
        geometrySelection.clearSelectionState()
      },
      onSetActiveFootprintKwp: (kwp: number) => {
        project.setActiveFootprintKwp(kwp)
        const footprintId = project.state.activeFootprintId
        if (footprintId) {
          tutorial.setTutorialEditedKwpByFootprint((current) => ({ ...current, [footprintId]: true }))
        }
      },
      onDeleteActiveFootprint: () => {
        if (!project.state.activeFootprintId) {
          return
        }
        project.deleteFootprint(project.state.activeFootprintId)
        geometrySelection.clearSelectionState()
      },
    }),
    [
      geometrySelection,
      project,
      tutorial,
    ],
  )

  const roofEditor = useMemo<RoofEditorProps>(
    () => ({
      footprint: project.activeFootprint,
      vertexConstraints: project.activeConstraints.vertexHeights,
      selectedVertexIndex: geometrySelection.safeSelectedVertexIndex,
      selectedEdgeIndex: geometrySelection.safeSelectedEdgeIndex,
      onSetVertex: (vertexIndex: number, heightM: number) => {
        if (!project.activeFootprint) {
          return false
        }
        return project.setFootprintVertexHeight(project.activeFootprint.id, vertexIndex, heightM)
      },
      onSetEdge: (edgeIndex: number, heightM: number) => {
        if (!project.activeFootprint) {
          return false
        }
        return project.setFootprintEdgeHeight(project.activeFootprint.id, edgeIndex, heightM)
      },
      onClearVertex: (vertexIndex: number) => {
        if (!project.activeFootprint) {
          return
        }
        project.clearFootprintVertexHeight(project.activeFootprint.id, vertexIndex)
      },
      onClearEdge: (edgeIndex: number) => {
        if (!project.activeFootprint) {
          return
        }
        project.clearFootprintEdgeHeight(project.activeFootprint.id, edgeIndex)
      },
      onConstraintLimitExceeded: geometryEditing.setConstraintLimitError,
    }),
    [geometryEditing.setConstraintLimitError, geometrySelection.safeSelectedEdgeIndex, geometrySelection.safeSelectedVertexIndex, project],
  )

  const obstaclePanel = useMemo<ObstaclePanelProps>(
    () => ({
      obstacles: project.obstacles,
      activeObstacle: project.activeObstacle,
      selectedObstacleIds: project.state.selectedObstacleIds,
      onSelectObstacle: (obstacleId: string, multiSelect: boolean) => {
        if (multiSelect) {
          project.toggleObstacleSelection(obstacleId)
        } else {
          project.selectOnlyObstacle(obstacleId)
        }
        geometrySelection.clearSelectionState()
      },
      onSetActiveObstacleKind: (kind: ObstacleKind) => {
        if (!project.state.activeObstacleId) {
          return
        }
        project.setObstacleKind(project.state.activeObstacleId, kind)
      },
      onSetActiveObstacleHeight: (heightM: number) => {
        if (!project.state.activeObstacleId) {
          return
        }
        project.setObstacleHeight(project.state.activeObstacleId, heightM)
      },
      onDeleteActiveObstacle: () => {
        if (!project.state.activeObstacleId) {
          return
        }
        project.deleteObstacle(project.state.activeObstacleId)
        geometrySelection.clearSelectionState()
      },
    }),
    [geometrySelection, project],
  )

  const statusPanel = useMemo<StatusPanelProps>(
    () => ({
      warnings: analysis.solvedRoofs.activeSolved?.solution.warnings ?? [],
      basePitchDeg: analysis.solvedMetrics.basePitchDeg,
      pitchAdjustmentPercent: activeFootprintMetrics.activePitchAdjustmentPercent,
      adjustedPitchDeg: activeFootprintMetrics.adjustedPitchDeg,
      onSetPitchAdjustmentPercent: (pitchAdjustmentPercent: number) => {
        project.setActivePitchAdjustmentPercent(clampPitchAdjustmentPercent(pitchAdjustmentPercent))
      },
      azimuthDeg: analysis.solvedMetrics.azimuthDeg,
      roofAreaM2: analysis.solvedMetrics.roofAreaM2,
      minHeightM: analysis.solvedMetrics.minHeightM,
      maxHeightM: analysis.solvedMetrics.maxHeightM,
      fitRmsErrorM: analysis.solvedMetrics.fitRmsErrorM,
      activeFootprintLatDeg: activeFootprintMetrics.activeFootprintCentroid?.[1] ?? null,
      activeFootprintLonDeg: activeFootprintMetrics.activeFootprintCentroid?.[0] ?? null,
    }),
    [
      activeFootprintMetrics.activeFootprintCentroid,
      activeFootprintMetrics.activePitchAdjustmentPercent,
      activeFootprintMetrics.adjustedPitchDeg,
      analysis.solvedMetrics.azimuthDeg,
      analysis.solvedMetrics.basePitchDeg,
      analysis.solvedMetrics.fitRmsErrorM,
      analysis.solvedMetrics.maxHeightM,
      analysis.solvedMetrics.minHeightM,
      analysis.solvedMetrics.roofAreaM2,
      analysis.solvedRoofs.activeSolved,
      project,
    ],
  )

  return useMemo(
    () => ({
      footprintPanel,
      roofEditor,
      obstaclePanel,
      statusPanel,
    }),
    [footprintPanel, obstaclePanel, roofEditor, statusPanel],
  )
}
