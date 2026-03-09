import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'

const requiredDocs = [
  'docs/ARCHITECTURE.md',
  'docs/RUNBOOK.md',
  'docs/DECISIONS.md',
  'docs/FEATURES.md',
  'docs/VENDOR_HANDOVER.md',
]

const activeDocs = [
  'README.md',
  'docs/runtime_boundaries.md',
  'docs/ARCHITECTURE.md',
  'docs/RUNBOOK.md',
  'docs/DECISIONS.md',
  'docs/FEATURES.md',
  'docs/VENDOR_HANDOVER.md',
]

const forbiddenDocPatterns = [
  'src/app/components/MapView/',
  'src/app/components/DrawTools/',
  'src/app/screens/EditorScreen.tsx',
]

async function assertRequiredDocs() {
  const missing = []
  for (const docPath of requiredDocs) {
    try {
      await access(docPath, constants.F_OK)
    } catch {
      missing.push(docPath)
    }
  }
  return missing
}

async function scanDocsForStalePaths() {
  const staleUsages = []

  for (const docPath of activeDocs) {
    const content = await readFile(docPath, 'utf8')
    for (const pattern of forbiddenDocPatterns) {
      if (content.includes(pattern)) {
        staleUsages.push(`${docPath}: contains stale path \`${pattern}\``)
      }
    }
  }

  return staleUsages
}

async function main() {
  const errors = []

  const missingDocs = await assertRequiredDocs()
  if (missingDocs.length > 0) {
    errors.push(`Missing required handover docs: ${missingDocs.join(', ')}`)
  }

  const staleDocPaths = await scanDocsForStalePaths()
  errors.push(...staleDocPaths)

  if (errors.length > 0) {
    console.error('Repository validation failed:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exit(1)
  }

  console.log('Repository validation passed.')
}

void main()
