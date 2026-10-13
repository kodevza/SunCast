#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import {
  getPvgisProductionReport,
  type SelectedRoofSunInput,
} from '../core'
import { resolveReportDateIso } from './reportDate'
import { resolveReportYear } from './reportYear'

interface CliInput {
  roofs: SelectedRoofSunInput[]
}

function usage(): string {
  return 'Usage: suncast report <input.json> [--date YYYY-MM-DD] [--year YYYY] [--format table|json]'
}

function parseInput(value: unknown): CliInput {
  if (!value || typeof value !== 'object') throw new Error('Input must be a JSON object.')
  const candidate = value as Partial<CliInput>
  if (!Array.isArray(candidate.roofs)) throw new Error('Input must contain a roofs array.')
  return { roofs: candidate.roofs as SelectedRoofSunInput[] }
}

function toTable(report: Awaited<ReturnType<typeof getPvgisProductionReport>>): string {
  const lines = [
    `PVGIS exact-day simulation — ${report.dateIso}`,
    `PVGIS climate-data year: ${report.year ?? 'default multi-year reference period'}`,
    `Capacity: ${report.totalSelectedKwp.toFixed(1)} kWp`,
    `Status: ${report.status}`,
    `Daily energy: ${report.dailyEnergyKwh === null ? 'n/a' : `${report.dailyEnergyKwh.toFixed(2)} kWh`}`,
    `Annual energy: ${report.annualEnergyKwh === null ? 'n/a' : `${report.annualEnergyKwh.toFixed(2)} kWh`}`,
    '',
    'Monthly distribution (kWh):',
    ...report.monthlyEnergyKwh.map(({ month, energyKwh }) => `- ${String(month).padStart(2, '0')}: ${energyKwh.toFixed(2)}`),
  ]
  if (report.warnings.length > 0) lines.push('', 'Warnings:', ...report.warnings.map((warning) => `- ${warning}`))
  return lines.join('\n')
}

async function main(args: string[]): Promise<void> {
  const [command, inputPath, ...options] = args
  if (command !== 'report' || !inputPath) throw new Error(usage())
  const format = options.includes('--format') ? options[options.indexOf('--format') + 1] : 'table'
  if (format !== 'table' && format !== 'json') throw new Error('--format must be table or json.')
  const input = parseInput(JSON.parse(await readFile(inputPath, 'utf8')))
  const dateIso = resolveReportDateIso(options)
  const year = resolveReportYear(options)
  const report = await getPvgisProductionReport({ dateIso, year, roofs: input.roofs })
  process.stdout.write(`${format === 'json' ? JSON.stringify(report, null, 2) : toTable(report)}\n`)
  if (report.status === 'unavailable') process.exitCode = 2
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unknown CLI error'}\n`)
  process.exitCode = 1
})
