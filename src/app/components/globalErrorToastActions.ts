export const GLOBAL_ERROR_TOAST_ACTION_EVENT_NAME = 'suncast:global-error-toast-action'

export type GlobalErrorToastAction = 'reset-state' | 'share-state'

export interface GlobalErrorToastActionEventDetail {
  action: GlobalErrorToastAction
}

export function dispatchGlobalErrorToastAction(action: GlobalErrorToastAction): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<GlobalErrorToastActionEventDetail>(GLOBAL_ERROR_TOAST_ACTION_EVENT_NAME, {
      detail: { action },
    }),
  )
}
