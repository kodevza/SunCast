import { describe, expect, it } from 'vitest'
import useAnalysisSource from './useAnalysis.ts?raw'

describe('useAnalysis module boundaries', () => {
  it('does not import analysis orchestration from app/hooks', () => {
    expect(useAnalysisSource).not.toContain('../hooks/')
  })
})
