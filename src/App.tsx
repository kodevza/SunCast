import { SunCastScreen } from './app/screens/SunCastScreen'
import { AppErrorBoundary } from './app/components/AppErrorBoundary'
import { GlobalErrorToasts } from './app/components/GlobalErrorToasts'

function App() {
  return (
    <>
      <AppErrorBoundary>
        <SunCastScreen />
      </AppErrorBoundary>
      <GlobalErrorToasts />
    </>
  )
}

export default App
