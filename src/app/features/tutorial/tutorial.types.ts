export interface SunCastTutorialModel {
  mapInitialized: boolean
  draftVertexCount: number
  hasFinishedPolygon: boolean
  kwp: number | null
  hasEditedKwp: boolean
  constrainedVertexCount: number
  orbitEnabled: boolean
  hasEditedDatetime: boolean
  onReady: (controls: { startTutorial: () => void }) => void
}
