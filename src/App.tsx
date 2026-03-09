import { SunCastScreen } from './app/screens/SunCastScreen'
import { AppErrorBoundary } from './app/components/AppErrorBoundary'

function App() {
  return (
    <AppErrorBoundary>
      <SunCastScreen />
    </AppErrorBoundary>
  )
}

export default App
