import { expect, type Page } from '@playwright/test'
import { openAnnualSunAccessTab } from './app-helpers'

export async function runAnnualSimulation(page: Page) {
  await openAnnualSunAccessTab(page)

  await page.getByLabel('Day step').fill('60')
  await page.getByLabel('Time step (min)').fill('180')
  await page.getByTestId('annual-grid-resolution-input').fill('2')

  await page.getByTestId('annual-sim-run').click()
  await expect(page.getByTestId('annual-sim-results')).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText(/Heatmap cells:/)).toBeVisible()
}

export async function readAnnualSunAccessRatio(page: Page): Promise<number> {
  const ratioLine = page.locator('[data-testid="annual-sim-results"] p').filter({ hasText: 'Sun access ratio:' })
  const ratioText = await ratioLine.innerText()
  const parsedPercent = Number.parseFloat(ratioText.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(parsedPercent)) {
    throw new Error(`Unable to parse annual ratio from: ${ratioText}`)
  }
  return parsedPercent
}

export async function readAnnualHeatmapCellsCount(page: Page): Promise<number> {
  const cellsLine = page.locator('[data-testid="annual-sim-results"] p').filter({ hasText: 'Heatmap cells:' })
  const cellsText = await cellsLine.innerText()
  const parsedCells = Number.parseInt(cellsText.replace(/[^0-9]/g, ''), 10)
  if (!Number.isFinite(parsedCells)) {
    throw new Error(`Unable to parse heatmap cell count from: ${cellsText}`)
  }
  return parsedCells
}

export async function readAnnualHeatmapColorVariance(page: Page): Promise<number> {
  const variance = await page.getByTestId('annual-sim-heatmap-canvas').evaluate((canvasElement) => {
    if (!(canvasElement instanceof HTMLCanvasElement)) {
      throw new Error('Heatmap canvas is not HTMLCanvasElement')
    }
    const context = canvasElement.getContext('2d')
    if (!context) {
      throw new Error('2d context unavailable')
    }
    const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height)
    const pixels = imageData.data
    const uniqueColors = new Set<string>()

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]
      if (alpha === 0) {
        continue
      }
      uniqueColors.add(`${pixels[i]}-${pixels[i + 1]}-${pixels[i + 2]}`)
    }

    return uniqueColors.size
  })
  return variance
}
