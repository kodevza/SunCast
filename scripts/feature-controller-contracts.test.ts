import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectFeatureControllerContracts } from './feature-controller-contracts.mjs'

function findReport(reports: Awaited<ReturnType<typeof collectFeatureControllerContracts>>, fileName: string) {
  const report = reports.find((entry) => path.basename(entry.filePath) === fileName)
  if (!report) {
    throw new Error(`Missing report for ${fileName}`)
  }
  return report
}

function accessPaths(report: Awaited<ReturnType<typeof collectFeatureControllerContracts>>[number]) {
  return report.accesses.map((entry) => entry.path.join('.'))
}

describe('feature controller contract extractor', () => {
  it.skip('scans a feature directory and collects every controller under it', async () => {
    const reports = await collectFeatureControllerContracts({
      rootDir: 'src/app/features/sidebar',
    })

    expect(reports).toHaveLength(1)
    const merged = reports[0]
    expect(merged).toBeDefined()
    expect(merged?.exportName).toBe('SidebarFeatureContract')
    expect(path.relative(process.cwd(), merged?.filePath ?? '')).toBe('src/app/features/sidebar')

    expect(accessPaths(merged!)).toEqual(
      expect.arrayContaining([
        'analysis.solvedMetrics.basePitchDeg',
        'analysis.solvedRoofs.activeSolved.solution.warnings',
        'geometryEditing.setConstraintLimitError',
        'geometrySelection.clearSelectionState',
        'geometrySelection.safeSelectedVertexIndex',
        'project.activeConstraints.vertexHeights',
        'project.activeFootprint',
        'project.activeFootprint.id',
        'project.activeObstacle',
        'project.clearFootprintEdgeHeight',
        'project.clearFootprintSelection',
        'project.clearObstacleSelection',
        'project.deleteFootprint',
        'project.deleteObstacle',
        'project.setActivePitchAdjustmentPercent',
        'project.setActiveFootprintKwp',
        'project.setFootprintEdgeHeight',
        'project.setFootprintVertexHeight',
        'project.setObstacleHeight',
        'project.setObstacleKind',
        'project.selectedFootprintIds',
        'project.state.footprints',
        'project.state.activeFootprintId',
        'project.state.activeObstacleId',
        'project.state.selectedObstacleIds',
        'project.obstacles',
        'tutorial.setTutorialEditedKwpByFootprint',
      ]),
    )
  })

  it.skip('captures transitive dependencies for sidebar controllers', async () => {
    const reports = await collectFeatureControllerContracts({
      entryFiles: [
        'src/app/features/sidebar/useFootprintPanelController.ts',
        'src/app/features/map-editor/DrawTools/hooks/useDrawToolsController.ts',
      ],
    })

    expect(reports).toHaveLength(2)

    const footprintPanel = findReport(reports, 'useFootprintPanelController.ts')
    expect(accessPaths(footprintPanel)).toEqual(
      expect.arrayContaining([
        'project.state.activeFootprintId',
        'project.state.footprints',
        'project.selectedFootprintIds',
        'project.activeFootprint',
        'project.setActiveFootprintKwp',
        'project.deleteFootprint',
        'project.selectOnlyFootprint',
        'geometrySelection.clearSelectionState',
        'tutorial.setTutorialEditedKwpByFootprint',
      ]),
    )

    const drawTools = findReport(reports, 'useDrawToolsController.ts')
    expect(accessPaths(drawTools)).toEqual(
      expect.arrayContaining([
        'project.state.isDrawing',
        'project.state.isDrawingObstacle',
        'project.state.drawDraft.length',
        'project.state.obstacleDrawDraft.length',
        'project.cancelObstacleDrawing',
        'project.cancelDrawing',
        'project.startDrawing',
        'project.undoDraftPoint',
        'project.commitFootprint',
        'project.startObstacleDrawing',
        'project.undoObstacleDraftPoint',
        'project.commitObstacle',
        'mapView.setOrbitEnabled',
        'editMode.editMode',
        'editMode.setEditMode',
        'geometrySelection.clearSelectionState',
      ]),
    )
  })
})
