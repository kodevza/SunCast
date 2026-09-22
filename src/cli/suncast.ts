#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import {
  fetchOpenMeteoTiltedIrradiance,
  getForecastProductionReport,
  type SelectedRoofSunInput,
} from '../core'

interface CliInput {
  createdDateTime: string
  roofs: SelectedRoofSunInput[]
}

function usage(): string {
  return 'Usage: suncast report <input.json> [--format table|json]'
}

function parseInput(value: unknown): CliInput {
  if (!value || typeof value !== 'object') throw new Error('Input must be a JSON object.')
  const candidate = value as Partial<CliInput>
  if (typeof candidate.createdDateTime !== 'string' || !Array.isArray(candidate.roofs)) {
    throw new Error('Input must contain createdDateTime and roofs array.')
  }
  const createdAt = new Date(candidate.createdDateTime)
  if (Number.isNaN(createdAt.getTime()) || !/(Z|[+-]\d{2}:\d{2})$/i.test(candidate.createdDateTime)) {
    throw new Error('createdDateTime must be an ISO datetime with a timezone.')
  }
  return { createdDateTime: candidate.createdDateTime, roofs: candidate.roofs as SelectedRoofSunInput[] }
}

function toTable(report: Awaited<ReturnType<typeof getForecastProductionReport>>): string {
  const lines = [
    `Forecast UTC — ${report.dateIso}`,
    `Capacity: ${report.totalSelectedKwp.toFixed(1)} kWp`,
    `Status: ${report.status}`,
    `Total energy: ${report.totalEnergyKwh === null ? 'n/a' : `${report.totalEnergyKwh.toFixed(2)} kWh`}`,
    `Peak: ${report.peak ? `${report.peak.powerKw.toFixed(2)} kW at ${report.peak.timeLabel} UTC` : 'n/a'}`,
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
  const dateIso = new Date(input.createdDateTime).toISOString().slice(0, 10)
  const report = await getForecastProductionReport({
    dateIso,
    roofs: input.roofs,
    fetchRoofIrradiance: (roof, dateIso, signal) => fetchOpenMeteoTiltedIrradiance({
      latDeg: roof.latDeg, lonDeg: roof.lonDeg, roofPitchDeg: roof.roofPitchDeg,
      roofAzimuthDeg: roof.roofAzimuthDeg, timeZone: 'UTC', dateIso, signal,
    }),
  })
  process.stdout.write(`${format === 'json' ? JSON.stringify(report, null, 2) : toTable(report)}\n`)
  if (report.status === 'unavailable') process.exitCode = 2
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unknown CLI error'}\n`)
  process.exitCode = 1
})
