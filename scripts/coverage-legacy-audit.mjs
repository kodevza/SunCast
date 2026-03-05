#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const args = {
    lcov: 'coverage/lcov.info',
    onlyLegacy: false,
    json: false,
    failOnLegacy: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--lcov') {
      const next = argv[i + 1]
      if (!next) {
        throw new Error('Missing value for --lcov')
      }
      args.lcov = next
      i += 1
      continue
    }
    if (arg === '--only-legacy') {
      args.onlyLegacy = true
      continue
    }
    if (arg === '--json') {
      args.json = true
      continue
    }
    if (arg === '--fail-on-legacy') {
      args.failOnLegacy = true
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function parseLcov(content) {
  const records = []
  let current = null

  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      current = { file: line.slice(3), fnLines: new Map(), fnHits: new Map() }
      records.push(current)
      continue
    }

    if (!current) {
      continue
    }

    if (line.startsWith('FN:')) {
      const value = line.slice(3)
      const commaIndex = value.indexOf(',')
      if (commaIndex === -1) {
        continue
      }
      const fnLine = Number(value.slice(0, commaIndex))
      const fnName = value.slice(commaIndex + 1)
      current.fnLines.set(`${fnLine}:${fnName}`, { line: fnLine, name: fnName })
      continue
    }

    if (line.startsWith('FNDA:')) {
      const value = line.slice(5)
      const commaIndex = value.indexOf(',')
      if (commaIndex === -1) {
        continue
      }
      const hits = Number(value.slice(0, commaIndex))
      const fnName = value.slice(commaIndex + 1)
      const matchingEntries = Array.from(current.fnLines.values()).filter((entry) => entry.name === fnName)
      if (matchingEntries.length === 0) {
        continue
      }
      for (const entry of matchingEntries) {
        current.fnHits.set(`${entry.line}:${entry.name}`, hits)
      }
    }
  }

  return records
}

function safeReadLines(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  } catch {
    return []
  }
}

function isLegacyCandidate(functionName, sourceLine) {
  const legacyPattern = /(legacy|migrate|deprecated|compat|v1)/i
  return legacyPattern.test(functionName) || legacyPattern.test(sourceLine)
}

function createAudit(records, rootDir) {
  const untested = []
  const legacy = []
  const stale = []

  for (const record of records) {
    const absolutePath = path.isAbsolute(record.file) ? record.file : path.resolve(rootDir, record.file)
    const lines = safeReadLines(absolutePath)

    for (const [key, descriptor] of record.fnLines.entries()) {
      const hits = record.fnHits.get(key) ?? 0
      if (hits !== 0) {
        continue
      }
      if (descriptor.name.startsWith('(anonymous_')) {
        continue
      }

      const lineText = lines[descriptor.line - 1] ?? ''
      if (!lineText.includes(descriptor.name)) {
        stale.push({
          file: record.file,
          line: descriptor.line,
          function: descriptor.name,
        })
        continue
      }

      const item = {
        file: record.file,
        line: descriptor.line,
        function: descriptor.name,
        source: lineText.trim(),
      }

      untested.push(item)
      if (isLegacyCandidate(descriptor.name, lineText)) {
        legacy.push(item)
      }
    }
  }

  untested.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file)
    }
    return a.line - b.line
  })

  legacy.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file)
    }
    return a.line - b.line
  })

  stale.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file)
    }
    return a.line - b.line
  })

  return { untested, legacy, stale }
}

function printHuman(audit, onlyLegacy) {
  const items = onlyLegacy ? audit.legacy : audit.untested
  const header = onlyLegacy ? 'Untested legacy candidates' : 'Untested named functions'
  console.log(`${header}: ${items.length}`)

  if (items.length === 0) {
    return
  }

  for (const item of items) {
    console.log(`- ${item.file}:${item.line} :: ${item.function}`)
  }

  if (audit.stale.length > 0) {
    console.log('')
    console.log(`Stale coverage entries ignored: ${audit.stale.length}`)
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const lcovPath = path.resolve(process.cwd(), args.lcov)

  if (!fs.existsSync(lcovPath)) {
    throw new Error(`Coverage file not found: ${lcovPath}`)
  }

  const lcovContent = fs.readFileSync(lcovPath, 'utf8')
  const records = parseLcov(lcovContent)
  const audit = createAudit(records, process.cwd())

  if (args.json) {
    const payload = args.onlyLegacy ? { legacy: audit.legacy } : audit
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(audit, args.onlyLegacy)
    if (!args.onlyLegacy && audit.legacy.length > 0) {
      console.log('')
      console.log(`Legacy candidates: ${audit.legacy.length}`)
      for (const item of audit.legacy) {
        console.log(`- ${item.file}:${item.line} :: ${item.function}`)
      }
    }
  }

  if (args.failOnLegacy && audit.legacy.length > 0) {
    process.exitCode = 1
  }
}

main()
