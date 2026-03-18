import { prepareActiveFootprintGeometry } from '../hooks/activeFootprintGeometry'
import { useSunCastEffects } from '../hooks/useSunCastEffects'
import { useSunCastAppContext } from './SunCastAppProvider'

export function SunCastEffects() {
  const { project, session, analysis, obstacleMeshResults, commands } = useSunCastAppContext()
  const activeFootprintErrors = prepareActiveFootprintGeometry(project.activeFootprint).activeFootprintErrors

  useSunCastEffects({
    projectDocument: project,
    editorSession: session,
    analysis,
    activeFootprintErrors,
    obstacleMeshResults,
    onShareProject: commands.onShareProject,
  })

  return null
}
