import { expect, test } from './fixtures/coverage'
import { openApp, prepareCleanState, readStoredProject } from './helpers/app-helpers'
import { drawRoof } from './helpers/drawing-helpers'
import { setVertexHeight } from './helpers/editor-helpers'

test.beforeEach(async ({ page }) => {
  await prepareCleanState(page)
})

test('persistence and multi-footprint behavior', async ({ page }) => {
  await openApp(page)

  await drawRoof(page, [
    [0.22, 0.21],
    [0.44, 0.22],
    [0.34, 0.46],
  ])
  await setVertexHeight(page, 0, 3)
  await setVertexHeight(page, 1, 5)
  await setVertexHeight(page, 2, 8)
  await expect(page.getByTestId('status-pitch-value')).toBeVisible()

  const pitchBeforeReload = await page.getByTestId('status-pitch-value').innerText()

  await drawRoof(page, [
    [0.66, 0.34],
    [0.82, 0.35],
    [0.78, 0.58],
  ])

  await expect(page.locator('.footprint-list-item')).toHaveCount(2)

  await page.locator('.footprint-list-item').first().click()
  await expect(page.locator('.footprint-list-item-active')).toHaveCount(1)
  await expect(page.getByText(/Active constraints:/)).toContainText('V0=3.00m')

  await page.reload()

  await expect(page.locator('.footprint-list-item')).toHaveCount(2)
  await page.locator('.footprint-list-item').first().click()
  await expect(page.locator('.footprint-list-item-active')).toHaveCount(1)
  await expect(page.getByText(/Active constraints:/)).toContainText('V0=3.00m')
  await expect(page.getByTestId('status-pitch-value')).toHaveText(pitchBeforeReload)

  const stored = await readStoredProject(page)
  expect(Object.keys(stored.footprints)).toHaveLength(2)
  for (const footprint of Object.values(stored.footprints)) {
    expect(Array.isArray(footprint.polygon)).toBeTruthy()
    expect(typeof footprint.vertexHeights).toBe('object')
    expect((footprint as Record<string, unknown>).mesh).toBeUndefined()
  }

  await page.getByRole('button', { name: 'Delete Active Footprint' }).click()
  await expect(page.locator('.footprint-list-item')).toHaveCount(1)

  const storedAfterDelete = await readStoredProject(page)
  expect(Object.keys(storedAfterDelete.footprints)).toHaveLength(1)
})
