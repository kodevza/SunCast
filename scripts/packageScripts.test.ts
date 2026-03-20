import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('package scripts', () => {
  it('exposes the coverage e2e alias used by npm run test:coverage:e2e', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts).toBeDefined()
    expect(packageJson.scripts?.['test:coverage:e2e']).toBeDefined()
    expect(packageJson.scripts?.['extract:feature-contracts']).toBeDefined()
  })
})
