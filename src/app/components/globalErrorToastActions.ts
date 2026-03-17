import { toastActionService, type GlobalErrorToastAction } from '../globalServices/toastActionService'

export type { GlobalErrorToastAction } from '../globalServices/toastActionService'

export function dispatchGlobalErrorToastAction(action: GlobalErrorToastAction): void {
  toastActionService.emit(action)
}
