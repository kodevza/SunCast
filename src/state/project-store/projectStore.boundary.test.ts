import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectStoreDir = path.resolve(__dirname)

describe('state/project-store module boundaries', () => {
  it('does not import from app runtime boundaries', () => {
    const sourceFiles = readdirSync(projectStoreDir).filter((entry: string) => {
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
