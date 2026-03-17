import { describe, expect, it } from 'vitest'
import componentActionsSource from '../components/globalErrorToastActions.ts?raw'
import globalErrorToastsTestSource from '../components/GlobalErrorToasts.test.tsx?raw'
import useGlobalToastActionsSource from '../hooks/useGlobalToastActions.ts?raw'

describe('toast action service boundaries', () => {
  it('uses the globalServices toast action service path', () => {
    expect(componentActionsSource).not.toContain('../services/toastActionService')
    expect(globalErrorToastsTestSource).not.toContain('../services/toastActionService')
    expect(useGlobalToastActionsSource).not.toContain('../../services/toastActionService')
  })
})
