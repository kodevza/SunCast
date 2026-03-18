import type { useAnalysis } from '../analysis/useAnalysis'
import type { useEditorSession } from '../editor-session/useEditorSession'
import type { useProjectStore } from '../project-store/useProjectStore'

export type ReturnTypeUseProjectDocument = ReturnType<typeof useProjectStore>
export type ReturnTypeUseEditorSession = ReturnType<typeof useEditorSession>
export type ReturnTypeUseAnalysis = ReturnType<typeof useAnalysis>
