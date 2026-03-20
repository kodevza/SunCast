import { useCallback, useRef, useState } from 'react'
import type { TutorialState } from '../../editor-session/editorSession.types'

export function useTutorialState(): TutorialState {
  const [tutorialEditedKwpByFootprint, setTutorialEditedKwpByFootprint] = useState<Record<string, true>>({})
  const [tutorialDatetimeEdited, setTutorialDatetimeEdited] = useState(false)
  const tutorialStartRef = useRef<() => void>(() => {})

  const setTutorialStart = useCallback((startTutorial: () => void) => {
    tutorialStartRef.current = startTutorial
  }, [])

  return {
    tutorialEditedKwpByFootprint,
    setTutorialEditedKwpByFootprint,
    tutorialDatetimeEdited,
    setTutorialDatetimeEdited,
    tutorialStartRef,
    setTutorialStart,
  }
}
