import { useCanvasModel } from './useCanvasModel'
import { useSidebarModel } from './useSidebarModel'
import type { SunCastCanvasModel, SunCastSidebarModel, SunCastTutorialModel } from './presentationModel.types'
import { useSunCastPresentationState } from './useSunCastPresentationState'
import { useTutorialModel } from './useTutorialModel'

export function useSunCastController(): {
  sidebarModel: SunCastSidebarModel
  canvasModel: SunCastCanvasModel
  tutorialModel: SunCastTutorialModel
} {
  const presentationState = useSunCastPresentationState()
  const sidebarModel = useSidebarModel(presentationState)
  const canvasModel = useCanvasModel(presentationState)
  const tutorialModel = useTutorialModel(presentationState)

  return { sidebarModel, canvasModel, tutorialModel }
}
