import { useMemo } from 'react'
import { useSelectionCommands } from '../../hooks/useSelectionCommands'
import { useFootprintCommands } from '../../hooks/useFootprintCommands'
import { useSunCastAppContext } from '../../screens/SunCastAppProvider'
import type { FootprintPanelProps } from './FootprintPanel'

export function useFootprintPanelController(): FootprintPanelProps {
  const { project, commands } = useSunCastAppContext()
  const selection = useSelectionCommands()
  const footprint = useFootprintCommands()
  const footprints = useMemo(
    () => Object.values(project.state.footprints).map((entry) => entry.footprint),
    [project.state.footprints],
  )

  return useMemo(
    () => ({
      footprints,
      activeFootprintId: project.state.activeFootprintId,
      selectedFootprintIds: project.selectedFootprintIds,
      activeFootprintKwp: project.activeFootprint?.kwp ?? null,
      onShareProject: commands.onShareProject,
      onSelectFootprint: selection.selectFootprint,
      onSetActiveFootprintKwp: footprint.setActiveFootprintKwp,
      onDeleteActiveFootprint: footprint.deleteActiveFootprint,
    }),
    [
      commands.onShareProject,
      footprint.deleteActiveFootprint,
      footprint.setActiveFootprintKwp,
      project.activeFootprint,
      project.selectedFootprintIds,
      project.state.activeFootprintId,
      footprints,
      selection.selectFootprint,
    ],
  )
}
