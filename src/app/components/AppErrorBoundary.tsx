import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportAppErrorCode } from '../../shared/errors'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SunCast runtime error', error, errorInfo)
    reportAppErrorCode('UNEXPECTED_RUNTIME_ERROR', 'Unexpected runtime error reached AppErrorBoundary.', {
      cause: error,
      context: {
        area: 'app-error-boundary',
        componentStack: errorInfo.componentStack,
        enableStateReset: true,
      },
    })
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}
