import { useEffect } from 'react'

interface UseDrawKeyboardShortcutsArgs {
  enabled: boolean
  canFinish: boolean
  onUndo: () => void
  onFinish: () => void
}

export function useDrawKeyboardShortcuts({ enabled, canFinish, onUndo, onFinish }: UseDrawKeyboardShortcutsArgs): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as HTMLElement).isContentEditable)
      if (isInput) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        onUndo()
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        onUndo()
        return
      }

      if (event.key === 'Enter' && canFinish) {
        event.preventDefault()
        onFinish()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canFinish, enabled, onFinish, onUndo])
}
