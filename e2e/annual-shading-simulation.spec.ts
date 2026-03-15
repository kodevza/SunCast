import { expect, test } from './fixtures/coverage'
import { openApp, prepareCleanState } from './helpers/app-helpers'
import { drawObstacle, drawRoofSizedRectangle } from './helpers/drawing-helpers'
import { setVertexHeight } from './helpers/editor-helpers'
import {
  readAnnualHeatmapCellsCount,
  readAnnualHeatmapColorVariance,
  readAnnualSunAccessRatio,
  runAnnualSimulation,
} from './helpers/simulation-helpers'

test.beforeEach(async ({ page }) => {
  await prepareCleanState(page)
})

test('annual shading simulation generates varied output and reacts to obstacles', async ({ page }) => {
  await openApp(page)

  await drawRoofSizedRectangle(page, 6, 4)
  await setVertexHeight(page, 0, 2)
  await setVertexHeight(page, 1, 4)
  await setVertexHeight(page, 2, 6)
  await expect(page.getByTestId('status-pitch-value')).toBeVisible()

  await drawObstacle(page, [
    [0.39, 0.41],
    [0.45, 0.42],
    [0.44, 0.49],
    [0.39, 0.48],
  ])

  await page.getByRole('button', { name: 'Obstacle Mode' }).click()
  const obstacleHeightInput = page.locator('label', { hasText: 'Height above ground (m)' }).locator('input')
  await obstacleHeightInput.fill('0')
  await page.getByRole('button', { name: 'Roof Mode' }).click()

  await runAnnualSimulation(page)
  const ratioWithoutObstacle = await readAnnualSunAccessRatio(page)
  const cellsWithoutObstacle = await readAnnualHeatmapCellsCount(page)
  const varianceWithoutObstacle = await readAnnualHeatmapColorVariance(page)

  expect(cellsWithoutObstacle).toBeGreaterThan(0)
  expect(varianceWithoutObstacle).toBeGreaterThan(1)

  await page.getByRole('button', { name: 'Obstacle Mode' }).click()
  await obstacleHeightInput.fill('25')
  await page.getByRole('button', { name: 'Roof Mode' }).click()

  await runAnnualSimulation(page)
  const ratioWithObstacle = await readAnnualSunAccessRatio(page)
  const cellsWithObstacle = await readAnnualHeatmapCellsCount(page)
  const varianceWithObstacle = await readAnnualHeatmapColorVariance(page)

  expect(cellsWithObstacle).toBeGreaterThan(0)
  expect(varianceWithObstacle).toBeGreaterThan(1)
  expect(ratioWithObstacle).not.toBe(ratioWithoutObstacle)

  await page.getByTestId('annual-sim-toggle-heatmap').click()
  await expect(page.getByTestId('annual-sim-toggle-heatmap')).toContainText('Hide annual heatmap')
})
