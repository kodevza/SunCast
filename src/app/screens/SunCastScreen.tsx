import { SunCastCanvas } from './SunCastCanvas'
import { SunCastAppProvider } from './SunCastAppProvider'
import { SunCastEffects } from './SunCastEffects'
import { SunCastLayout } from './SunCastLayout'
import { SunCastSidebar } from './SunCastSidebar'
import { TutorialController } from '../features/tutorial/TutorialController'

export function SunCastScreen() {
  return (
    <SunCastAppProvider>
      <SunCastEffects />
      <SunCastLayout>
        <SunCastSidebar />
        <SunCastCanvas />
        <TutorialController />
      </SunCastLayout>
    </SunCastAppProvider>
  )
}
