import { expect, test } from './fixtures/coverage'
import { mockWarsawSearch, openApp, prepareCleanState, searchLocation } from './helpers/app-helpers'
import { clickMapRatios, drawObstacle, drawRoofSizedRectangle } from './helpers/drawing-helpers'
import { enterOrbitMode, setEdgeHeight, setSunDatetime, setVertexHeight } from './helpers/editor-helpers'

test.beforeEach(async ({ page }) => {
  await prepareCleanState(page)
})

test('search and critical editor flow', async ({ page }) => {
  await mockWarsawSearch(page)
  await openApp(page)

  await searchLocation(page, 'Warsaw')
  await expect(page).toHaveURL(/#.*lat=52.229700.*lon=21.012200/)

  await drawRoofSizedRectangle(page, 6, 4)
  await expect(page.getByText('CONSTRAINTS_INSUFFICIENT')).toBeVisible()

  await setEdgeHeight(page, 0, 3)
  await setVertexHeight(page, 0, 4)
  await setVertexHeight(page, 2, 8)
  await expect(page.getByText(/Active constraints:/)).toContainText('V0=4.00m')
  await expect(page.getByText(/Active constraints:/)).toContainText('V1=3.00m')
  await expect(page.getByText(/Active constraints:/)).toContainText('V2=8.00m')
  await expect(page.getByTestId('status-pitch-value')).toBeVisible()

  await drawObstacle(page, [
    [0.39, 0.41],
    [0.45, 0.42],
    [0.44, 0.49],
    [0.39, 0.48],
  ])
  await clickMapRatios(page, [[0.36, 0.36]])

  await enterOrbitMode(page)
  const meshToggle = page.getByTestId('mesh-visibility-toggle-button')
  await expect(meshToggle).toHaveText(/Hide meshes|Show meshes/i)
  const meshLabelBefore = (await meshToggle.innerText()).trim()
  await meshToggle.click()
  const meshLabelAfter = (await meshToggle.innerText()).trim()
  expect(meshLabelAfter).not.toBe(meshLabelBefore)

  const sunProjectionToggle = page.getByTestId('sun-projection-toggle')
  if (!(await sunProjectionToggle.isChecked())) {
    await sunProjectionToggle.check()
  }

  await setSunDatetime(page, '2026-06-21T08:00')
  await expect(page.getByTestId('sun-datetime-input')).toHaveValue('2026-06-21T08:00')

  await setSunDatetime(page, '2026-06-21T16:00')
  await expect(page.getByTestId('sun-datetime-input')).toHaveValue('2026-06-21T16:00')
})
