import type { EditorAction, EditorSessionState } from '../editor-session/editorSession.types'
import type { Action as ProjectStateAction, ProjectState as ProjectStateBase } from '../../state/project-store/projectState.types'

export type ProjectStoreAction = EditorAction | ProjectStateAction

export type ProjectStoreState = ProjectStateBase & EditorSessionState
