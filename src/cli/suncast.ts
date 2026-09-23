#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import {
  fetchOpenMeteoTiltedIrradiance,
  getForecastProductionReport,
  type SelectedRoofSunInput,
} from '../core'
import { resolveReportDateIso } from './reportDate'

interface CliInput {
  roofs: SelectedRoofSunInput[]
}

function usage(): string {
  return 'Usage: suncast report <input.json> [--date YYYY-MM-DD] [--format table|json]'
}

function parseInput(value: unknown): CliInput {
  if (!value || typeof value !== 'object') throw new Error('Input must be a JSON object.')
  const candidate = value as Partial<CliInput>
  if (!Array.isArray(candidate.roofs)) throw new Error('Input must contain a roofs array.')
  return { roofs: candidate.roofs as SelectedRoofSunInput[] }
}

function toTable(report: Awaited<ReturnType<typeof getForecastProductionReport>>): string {
  const lines = [
    `Forecast (local time) — ${report.dateIso}`,
    `Capacity: ${report.totalSelectedKwp.toFixed(1)} kWp`,
    `Status: ${report.status}`,
    `Total energy: ${report.totalEnergyKwh === null ? 'n/a' : `${report.totalEnergyKwh.toFixed(2)} kWh`}`,
    `Peak: ${report.peak ? `${report.peak.powerKw.toFixed(2)} kW at ${report.peak.timeLabel} local time` : 'n/a'}`,
  ]
  if (report.warnings.length > 0) lines.push('', 'Warnings:', ...report.warnings.map((warning) => `- ${warning}`))
  lines.push('', 'Assumptions:', ...report.assumptions.map((item) => `- ${item.text}`))
  return lines.join('\n')
}

async function main(args: string[]): Promise<void> {
  const [command, inputPath, ...options] = args
  if (command !== 'report' || !inputPath) throw new Error(usage())
  const format = options.includes('--format') ? options[options.indexOf('--format') + 1] : 'table'
  if (format !== 'table' && format !== 'json') throw new Error('--format must be table or json.')
  const input = parseInput(JSON.parse(await readFile(inputPath, 'utf8')))
  const dateIso = resolveReportDateIso(options)
  const report = await getForecastProductionReport({
    dateIso,
    roofs: input.roofs,
    fetchRoofIrradiance: (roof, dateIso, signal) => fetchOpenMeteoTiltedIrradiance({
      latDeg: roof.latDeg, lonDeg: roof.lonDeg, roofPitchDeg: roof.roofPitchDeg,
      roofAzimuthDeg: roof.roofAzimuthDeg, timeZone: 'auto', dateIso, signal,
    }),
  })
  process.stdout.write(`${format === 'json' ? JSON.stringify(report, null, 2) : toTable(report)}\n`)
  if (report.status === 'unavailable') process.exitCode = 2
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unknown CLI error'}\n`)
  process.exitCode = 1
})
