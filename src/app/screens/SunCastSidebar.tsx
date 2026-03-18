import { useEffect, useState } from 'react'
import { DrawTools } from '../features/map-editor/DrawTools/DrawTools'
import { FootprintPanel } from '../features/sidebar/FootprintPanel'
import { ObstaclePanel } from '../features/sidebar/ObstaclePanel'
import { RoofEditor } from '../features/sidebar/RoofEditor'
import { StatusPanel } from '../features/sidebar/StatusPanel'
import { useDrawToolsController } from '../features/sidebar/useDrawToolsController'
import { TutorialIntroOverlay } from '../features/tutorial/Tutorial/TutorialIntroOverlay'
import { useSunCastAppContext } from './SunCastAppProvider'
import { useFootprintPanelController } from '../features/sidebar/useFootprintPanelController'
import { useObstaclePanelController } from '../features/sidebar/useObstaclePanelController'
import { useRoofEditorController } from '../features/sidebar/useRoofEditorController'
import { useStatusPanelController } from '../features/sidebar/useStatusPanelController'

export function SunCastSidebar() {
  const { session } = useSunCastAppContext()
  const drawTools = useDrawToolsController()
  const footprintPanel = useFootprintPanelController()
  const roofEditor = useRoofEditorController()
  const obstaclePanel = useObstaclePanelController()
  const statusPanel = useStatusPanelController()
  const [tutorialIntroVisible, setTutorialIntroVisible] = useState(false)
  const activeEditorTab = drawTools.editMode

  useEffect(() => {
    if (!tutorialIntroVisible) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTutorialIntroVisible(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tutorialIntroVisible])

  return (
    <aside className="sun-cast-sidebar">
      <div className="sun-cast-sidebar-title-row">
        <h2>SunCast</h2>
        <button
          type="button"
          className="sun-cast-tutorial-trigger"
          onClick={() => setTutorialIntroVisible(true)}
          aria-label="Start tutorial"
          title="Start guided tutorial"
          data-testid="start-tutorial-button"
        >
          ?
        </button>
      </div>
      {tutorialIntroVisible && (
        <TutorialIntroOverlay
          onStartInteractiveTutorial={() => {
            setTutorialIntroVisible(false)
            session.tutorialStartRef.current()
          }}
          onClose={() => setTutorialIntroVisible(false)}
        />
      )}
      <p className="subtitle">Draw your roof and get short-term and long-term production forecasts.</p>
      <DrawTools {...drawTools} />

      <section className="sun-cast-editor-tabs-shell">
        {activeEditorTab === 'roof' ? (
          <div role="tabpanel" id="editor-panel-roof" aria-labelledby="editor-tab-roof">
            <FootprintPanel {...footprintPanel} />
            <RoofEditor {...roofEditor} />
          </div>
        ) : (
          <div role="tabpanel" id="editor-panel-obstacles" aria-labelledby="editor-tab-obstacles">
            <ObstaclePanel {...obstaclePanel} />
          </div>
        )}
      </section>

      <StatusPanel {...statusPanel} />
    </aside>
  )
}
