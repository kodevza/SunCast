import type { useAnalysis } from '../analysis/useAnalysis'
import type { EditorRuntimeState } from '../editor-session/editorSession.types'
import type { useProjectStore } from '../project-store/useProjectStore'

export type ReturnTypeUseProjectDocument = ReturnType<typeof useProjectStore>
export type ReturnTypeUseEditorSession = EditorRuntimeState
export type ReturnTypeUseAnalysis = ReturnType<typeof useAnalysis>
