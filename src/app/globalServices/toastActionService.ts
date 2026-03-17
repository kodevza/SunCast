export type GlobalErrorToastAction = 'reset-state' | 'share-state'

type ToastActionListener = (action: GlobalErrorToastAction) => void

class ToastActionService {
  private listeners = new Set<ToastActionListener>()

  emit(action: GlobalErrorToastAction): void {
    for (const listener of this.listeners) {
      listener(action)
    }
  }

  subscribe(listener: ToastActionListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export const toastActionService = new ToastActionService()
