#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import * as ts from 'typescript'

const DEFAULT_ROOT_DIR = 'src/app/features'
const CONTROLLER_FILE_RE = /use[A-Za-z0-9]+Controller(?:Model)?\.(ts|tsx)$/
const WRAPPER_PARAM_NAMES = new Set(['args', 'params', 'options'])
const NON_CONTROLLER_HELPER_CALL_RE = /^use[A-Z]/

function parseArgs(argv) {
  const args = {
    rootDir: DEFAULT_ROOT_DIR,
    format: 'ts',
    outFile: null,
    entryFiles: [],
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('-')) {
      if (args.rootDir !== DEFAULT_ROOT_DIR) {
        throw new Error(`Unexpected positional argument: ${arg}`)
      }
      args.rootDir = arg
      continue
    }
    if (arg === '--root') {
      const next = argv[index + 1]
      if (!next) {
        throw new Error('Missing value for --root')
      }
      args.rootDir = next
      index += 1
      continue
    }
    if (arg === '--format') {
      const next = argv[index + 1]
      if (!next || (next !== 'ts' && next !== 'json')) {
        throw new Error('Missing or invalid value for --format; expected ts or json')
      }
      args.format = next
      index += 1
      continue
    }
    if (arg === '--out') {
      const next = argv[index + 1]
      if (!next) {
        throw new Error('Missing value for --out')
      }
      args.outFile = next
      index += 1
      continue
    }
    if (arg === '--entry') {
      const next = argv[index + 1]
      if (!next) {
        throw new Error('Missing value for --entry')
      }
      args.entryFiles.push(next)
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function toPascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function toControllerInterfaceName(exportName) {
  return `Use${exportName.slice(3)}Contract`
}

async function walkSourceFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkSourceFiles(absolutePath)))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue
    }

    if (entry.name.includes('.test.')) {
      continue
    }

    files.push(absolutePath)
  }

  return files
}

function readTsConfig() {
  const configPath = path.resolve(process.cwd(), 'tsconfig.app.json')
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))
  }

  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath))
}

function createProgram() {
  const parsed = readTsConfig()
  return ts.createProgram(parsed.fileNames, parsed.options)
}

function resolveImport(fromFile, specifier) {
  const absoluteSpecifier = path.resolve(path.dirname(fromFile), specifier)
  const candidates = []

  if (path.extname(absoluteSpecifier)) {
    candidates.push(absoluteSpecifier)
  } else {
    candidates.push(
      `${absoluteSpecifier}.ts`,
      `${absoluteSpecifier}.tsx`,
      `${absoluteSpecifier}.mts`,
      `${absoluteSpecifier}.cts`,
      path.join(absoluteSpecifier, 'index.ts'),
      path.join(absoluteSpecifier, 'index.tsx'),
    )
  }

  for (const candidate of candidates) {
    if (ts.sys.fileExists(candidate)) {
      return path.normalize(candidate)
    }
  }

  return null
}

function isExported(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
}

function isIdentifier(node) {
  return ts.isIdentifier(node)
}

function isRootWrapperName(name) {
  return WRAPPER_PARAM_NAMES.has(name)
}

function getFunctionRoots(fnNode) {
  const roots = []
  const wrapperRoots = new Set()

  for (const parameter of fnNode.parameters) {
    if (ts.isIdentifier(parameter.name)) {
      const rootName = parameter.name.text
      roots.push(rootName)
      if (isRootWrapperName(rootName)) {
        wrapperRoots.add(rootName)
      }
      continue
    }

    if (ts.isObjectBindingPattern(parameter.name)) {
      for (const element of parameter.name.elements) {
        if (!ts.isIdentifier(element.name)) {
          continue
        }
        const rootName = element.name.text
        roots.push(rootName)
      }
    }
  }

  return { roots, wrapperRoots }
}

function getExportedFunctions(sourceFile) {
  const exported = []

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
      exported.push({ name: statement.name.text, node: statement })
      continue
    }

    if (!ts.isVariableStatement(statement) || !isExported(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue
      }
      const initializer = declaration.initializer
      if (!initializer) {
        continue
      }
      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        exported.push({ name: declaration.name.text, node: initializer })
      }
    }
  }

  return exported
}

function getImportsByLocalName(sourceFile, currentFilePath) {
  const imports = new Map()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue
    }
    const moduleSpecifier = statement.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpecifier)) {
      continue
    }

    const resolved = resolveImport(currentFilePath, moduleSpecifier.text)
    if (!resolved) {
      continue
    }

    const clause = statement.importClause
    if (!clause) {
      continue
    }

    if (clause.name) {
      imports.set(clause.name.text, {
        sourceFilePath: resolved,
        importedName: 'default',
      })
    }

    const namedBindings = clause.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue
    }

    for (const element of namedBindings.elements) {
      imports.set(element.name.text, {
        sourceFilePath: resolved,
        importedName: element.propertyName?.text ?? element.name.text,
      })
    }
  }

  return imports
}

function getCallableTypeText(checker, node, type) {
  const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call)
  if (signatures.length === 0) {
    return null
  }

  return checker.typeToString(
    type,
    node,
    ts.TypeFormatFlags.NoTruncation |
      ts.TypeFormatFlags.InTypeAlias |
      ts.TypeFormatFlags.UseFullyQualifiedType |
      ts.TypeFormatFlags.WriteArrowStyleSignature,
  )
}

function classifyAccess(pathSegments, typeText, isCallable) {
  if (isCallable) {
    return 'callback'
  }

  if (pathSegments.includes('state')) {
    return 'state'
  }

  return 'selector'
}

function createNode() {
  return {
    types: new Set(),
    children: new Map(),
  }
}

function mergeNode(target, source) {
  for (const type of source.types) {
    target.types.add(type)
  }

  for (const [key, child] of source.children.entries()) {
    const nextChild = target.children.get(key) ?? createNode()
    target.children.set(key, nextChild)
    mergeNode(nextChild, child)
  }
}

function addPath(root, pathSegments, typeText) {
  if (pathSegments.length === 0) {
    return
  }

  let current = root
  for (const segment of pathSegments) {
    if (!current.children.has(segment)) {
      current.children.set(segment, createNode())
    }
    current = current.children.get(segment)
  }

  current.types.add(typeText)
}

function resolvePathFromExpression(node, roots, wrapperRoots) {
  const segments = []
  let current = node

  while (true) {
    if (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression
      continue
    }

    if (ts.isPropertyAccessExpression(current)) {
      segments.unshift(current.name.text)
      current = current.expression
      continue
    }

    if (ts.isElementAccessExpression(current)) {
      current = current.expression
      continue
    }

    if (isIdentifier(current) && roots.includes(current.text)) {
      const isWrapper = wrapperRoots.has(current.text)
      return {
        rootName: current.text,
        pathSegments: isWrapper ? segments : [current.text, ...segments],
      }
    }

    return null
  }
}

function getExpressionTypeText(checker, node) {
  const type = checker.getTypeAtLocation(node)
  const text = checker.typeToString(
    type,
    node,
    ts.TypeFormatFlags.NoTruncation |
      ts.TypeFormatFlags.InTypeAlias |
      ts.TypeFormatFlags.UseFullyQualifiedType |
      ts.TypeFormatFlags.WriteArrowStyleSignature,
  )
  return { type, text }
}

function isProbablyLocalHookCall(name, importInfo) {
  return Boolean(importInfo) && NON_CONTROLLER_HELPER_CALL_RE.test(name)
}

function analyzeExportedFunction({
  checker,
  sourceFile,
  filePath,
  exportName,
  program,
  cache,
  inProgress,
}) {
  const cacheKey = `${filePath}#${exportName}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  if (inProgress.has(cacheKey)) {
    return {
      filePath,
      exportName,
      interfaceName: toControllerInterfaceName(exportName),
      rootTree: new Map(),
      accesses: [],
    }
  }

  const exported = getExportedFunctions(sourceFile).find((entry) => entry.name === exportName)
  if (!exported) {
    const empty = {
      filePath,
      exportName,
      interfaceName: toControllerInterfaceName(exportName),
      rootTree: new Map(),
      accesses: [],
    }
    cache.set(cacheKey, empty)
    return empty
  }

  inProgress.add(cacheKey)

  const rootsInfo = getFunctionRoots(exported.node)
  const imports = getImportsByLocalName(sourceFile, filePath)
  const rootTree = new Map()
  const accesses = []
  const seenAccesses = new Set()

  function mergeCurrentAccess(pathSegments, typeText, kind) {
    if (pathSegments.length === 0) {
      return
    }

    const accessKey = `${kind}:${pathSegments.join('.')}:${typeText}`
    if (seenAccesses.has(accessKey)) {
      return
    }
    seenAccesses.add(accessKey)
    accesses.push({ path: pathSegments, typeText, kind })

    const rootName = pathSegments[0]
    const rootNode = rootTree.get(rootName) ?? createNode()
    rootTree.set(rootName, rootNode)
    addPath(rootNode, pathSegments.slice(1), typeText)
  }

  function mergeContractFromCall(calleeReport, mappedRootNames) {
    const calleeRootNames = Array.from(calleeReport.rootTree.keys())
    for (const originalRootName of calleeRootNames) {
      const targetRootName = mappedRootNames.get(originalRootName) ?? originalRootName
      const sourceNode = calleeReport.rootTree.get(originalRootName)
      if (!sourceNode) {
        continue
      }
      const targetNode = rootTree.get(targetRootName) ?? createNode()
      rootTree.set(targetRootName, targetNode)
      mergeNode(targetNode, sourceNode)
    }

    for (const access of calleeReport.accesses) {
      const mappedRoot = mappedRootNames.get(access.path[0]) ?? access.path[0]
      const mappedPath = [mappedRoot, ...access.path.slice(1)]
      mergeCurrentAccess(mappedPath, access.typeText, access.kind)
    }
  }

  function visit(node) {
    if (ts.isPropertyAccessExpression(node)) {
      const resolved = resolvePathFromExpression(node, rootsInfo.roots, rootsInfo.wrapperRoots)
      if (resolved) {
        const { type, text } = getExpressionTypeText(checker, node)
        const isCallable = Boolean(getCallableTypeText(checker, node, type))
        const kind = classifyAccess(resolved.pathSegments, text, isCallable)
        mergeCurrentAccess(resolved.pathSegments, text, kind)
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const imported = imports.get(node.expression.text)
      if (isProbablyLocalHookCall(node.expression.text, imported)) {
        const calleeSource = program.getSourceFile(imported.sourceFilePath)
        if (calleeSource) {
          const calleeReport = analyzeExportedFunction({
            checker,
            sourceFile: calleeSource,
            filePath: imported.sourceFilePath,
            exportName: imported.importedName,
            program,
            cache,
            inProgress,
          })

          const mappedRoots = new Map()
          const calleeRoots = Array.from(calleeReport.rootTree.keys())
          const firstArg = node.arguments[0]

          if (ts.isObjectLiteralExpression(firstArg)) {
            const propertyMap = new Map()
            for (const property of firstArg.properties) {
              if (ts.isShorthandPropertyAssignment(property)) {
                propertyMap.set(property.name.text, property.name.text)
                continue
              }
              if (ts.isPropertyAssignment(property) && isIdentifier(property.name)) {
                propertyMap.set(property.name.text, property.name.text)
              }
            }

            for (const calleeRoot of calleeRoots) {
              mappedRoots.set(calleeRoot, propertyMap.get(calleeRoot) ?? calleeRoot)
            }
          } else if (ts.isIdentifier(firstArg)) {
            if (calleeRoots.length === 1) {
              mappedRoots.set(calleeRoots[0], firstArg.text)
            } else {
              for (const calleeRoot of calleeRoots) {
                mappedRoots.set(calleeRoot, calleeRoot)
              }
            }
          } else {
            for (const calleeRoot of calleeRoots) {
              mappedRoots.set(calleeRoot, calleeRoot)
            }
          }

          mergeContractFromCall(calleeReport, mappedRoots)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  if (exported.node.body) {
    visit(exported.node.body)
  }

  const report = {
    filePath,
    exportName,
    interfaceName: toControllerInterfaceName(exportName),
    rootTree,
    accesses: accesses.sort((a, b) => {
      const aPath = a.path.join('.')
      const bPath = b.path.join('.')
      if (aPath !== bPath) {
        return aPath.localeCompare(bPath)
      }
      return a.kind.localeCompare(b.kind)
    }),
  }

  cache.set(cacheKey, report)
  inProgress.delete(cacheKey)
  return report
}

function isControllerEntryFile(filePath) {
  return CONTROLLER_FILE_RE.test(path.basename(filePath)) && !filePath.includes('.test.')
}

function formatTypeSet(typeSet) {
  const types = Array.from(typeSet)
  if (types.length === 0) {
    return 'unknown'
  }
  const normalized = []
  const seen = new Set()

  for (const typeText of types.sort()) {
    const parts = typeText.split(' | ').map((part) => part.trim()).filter(Boolean)
    if (parts.length === 0) {
      continue
    }
    for (const part of parts) {
      if (seen.has(part)) {
        continue
      }
      seen.add(part)
      normalized.push(part)
    }
  }

  if (normalized.length === 0) {
    return 'unknown'
  }

  if (normalized.length === 1) {
    return normalized[0]
  }

  return normalized.join(' | ')
}

function mergeReports(reports, featureName, filePath) {
  const rootTree = new Map()
  const accesses = []
  const seenAccesses = new Set()

  for (const report of reports) {
    for (const [rootName, node] of report.rootTree.entries()) {
      const targetNode = rootTree.get(rootName) ?? createNode()
      rootTree.set(rootName, targetNode)
      mergeNode(targetNode, node)
    }

    for (const access of report.accesses) {
      const accessKey = `${access.kind}:${access.path.join('.')}:${access.typeText}`
      if (seenAccesses.has(accessKey)) {
        continue
      }
      seenAccesses.add(accessKey)
      accesses.push(access)
    }
  }

  accesses.sort((a, b) => {
    const aPath = a.path.join('.')
    const bPath = b.path.join('.')
    if (aPath !== bPath) {
      return aPath.localeCompare(bPath)
    }
    return a.kind.localeCompare(b.kind)
  })

  return {
    filePath,
    exportName: featureName,
    interfaceName: featureName,
    rootTree,
    accesses,
  }
}

function renderNode(node, indentLevel = 0) {
  const indent = '  '.repeat(indentLevel)
  const childEntries = Array.from(node.children.entries()).sort(([a], [b]) => a.localeCompare(b))

  if (node.types.size > 0 && childEntries.length === 0) {
    return formatTypeSet(node.types)
  }

  if (node.types.size > 0 && childEntries.length > 0) {
    const preferredType = formatTypeSet(node.types)
    if (preferredType !== 'unknown') {
      return preferredType
    }
  }

  const lines = ['{']
  for (const [childName, childNode] of childEntries) {
    lines.push(`${indent}  ${childName}: ${renderNode(childNode, indentLevel + 1)}`)
  }
  lines.push(`${indent}}`)
  return lines.join('\n')
}

function buildInterfaceText(report, interfaceName) {
  const lines = [`export interface ${interfaceName} {`]
  const rootEntries = Array.from(report.rootTree.entries()).sort(([a], [b]) => a.localeCompare(b))
  for (const [rootName, node] of rootEntries) {
    lines.push(`  ${rootName}: ${renderNode(node, 1)}`)
  }
  lines.push('}')
  return lines.join('\n')
}

function formatAccesses(report) {
  return report.accesses.map((access) => ({
    path: access.path.join('.'),
    kind: access.kind,
    type: access.typeText,
  }))
}

function toJsonPayload(reports) {
  return reports.map((report) => ({
    filePath: path.relative(process.cwd(), report.filePath),
    exportName: report.exportName,
    interfaceName: report.interfaceName,
    accesses: formatAccesses(report),
  }))
}

export async function collectFeatureControllerContracts({
  rootDir = DEFAULT_ROOT_DIR,
  entryFiles = [],
} = {}) {
  const program = createProgram()
  const checker = program.getTypeChecker()
  const sourceFilesByPath = new Map()

  for (const sourceFile of program.getSourceFiles()) {
    sourceFilesByPath.set(path.normalize(sourceFile.fileName), sourceFile)
  }

  const candidateFiles = entryFiles.length > 0 ? await Promise.all(entryFiles.map(async (entry) => path.resolve(process.cwd(), entry))) : await walkSourceFiles(path.resolve(process.cwd(), rootDir))

  const controllerFiles = candidateFiles.filter(isControllerEntryFile)
  const cache = new Map()
  const inProgress = new Set()
  const reports = []

  for (const filePath of controllerFiles) {
    const normalized = path.normalize(filePath)
    const sourceFile = sourceFilesByPath.get(normalized)
    if (!sourceFile) {
      continue
    }

    for (const exportedFunction of getExportedFunctions(sourceFile)) {
      if (!/Controller(?:Model)?$/.test(exportedFunction.name)) {
        continue
      }

      const report = analyzeExportedFunction({
        checker,
        sourceFile,
        filePath: normalized,
        exportName: exportedFunction.name,
        program,
        cache,
        inProgress,
      })
      reports.push(report)
    }
  }

  if (entryFiles.length === 0) {
    const normalizedRootDir = path.resolve(process.cwd(), rootDir)
    const featureName = `${toPascalCase(path.basename(normalizedRootDir))}FeatureContract`
    return [mergeReports(reports, featureName, normalizedRootDir)]
  }

  return reports
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const reports = await collectFeatureControllerContracts({
    rootDir: args.rootDir,
    entryFiles: args.entryFiles,
  })

  const output = args.format === 'json'
    ? JSON.stringify(toJsonPayload(reports), null, 2)
    : reports
        .map((report) => {
          const summary = formatAccesses(report)
          const stateFields = summary.filter((item) => item.kind === 'state').map((item) => item.path)
          const selectors = summary.filter((item) => item.kind === 'selector').map((item) => item.path)
          const callbacks = summary.filter((item) => item.kind === 'callback').map((item) => item.path)
          return [
            `// ${path.relative(process.cwd(), report.filePath)}`,
            `// state fields: ${stateFields.length > 0 ? stateFields.join(', ') : '(none)'}`,
            `// selectors: ${selectors.length > 0 ? selectors.join(', ') : '(none)'}`,
            `// callbacks: ${callbacks.length > 0 ? callbacks.join(', ') : '(none)'}`,
            buildInterfaceText(report, report.interfaceName),
          ].join('\n')
        })
        .join('\n\n')

  if (args.outFile) {
    await fs.writeFile(args.outFile, `${output}\n`)
    return
  }

  process.stdout.write(`${output}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error))
    process.exit(1)
  })
}
