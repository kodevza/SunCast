import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectStoreDir = path.resolve(import.meta.dirname)

describe('state/project-store module boundaries', () => {
  it('does not import from app runtime boundaries', () => {
    const sourceFiles = readdirSync(projectStoreDir).filter((entry) => {
      if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) {
        return false
      }
      return !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')
    })

    for (const fileName of sourceFiles) {
      const source = readFileSync(path.join(projectStoreDir, fileName), 'utf8')
      expect(source, `${fileName} should not import from src/app/*`).not.toMatch(
        /from ['"]\.\.\/\.\.\/app\//,
      )
    }
  })
})
