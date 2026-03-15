export type DrawEditMode = 'roof' | 'obstacle'

export interface DrawModeMeta {
  mode: DrawEditMode
  label: string
  title: string
}

export interface DrawWorkflowState {
  isDrawing: boolean
  pointCount: number
  canFinish: boolean
}
