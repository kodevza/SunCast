import { useCallback, type RefObject } from 'react'
import { useGlobalKeyDown } from '../../../../hooks/useGlobalKeyDown'

interface UseDrawLengthShortcutArgs {
  enabled: boolean
  inputRef: RefObject<HTMLInputElement | null>
}

export function useDrawLengthShortcut({ enabled, inputRef }: UseDrawLengthShortcutArgs): void {
  const handleDrawLengthShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey) {
        return
      }
      const input = inputRef.current
      if (!input) {
        return
      }
      if (document.activeElement === input) {
        return
      }
      event.preventDefault()
      input.focus()
      input.select()
    },
    [inputRef],
  )

  useGlobalKeyDown(handleDrawLengthShortcut, enabled)
}
