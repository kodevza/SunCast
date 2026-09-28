import { expect, test } from './fixtures/coverage'
import type { Page } from '@playwright/test'
import { openApp, prepareCleanState } from './helpers/app-helpers'
import { createSolvedRoof } from './helpers/editor-helpers'

test.beforeEach(async ({ page }) => {
  await prepareCleanState(page)
})

async function createTwoSolvedRoofs(page: Page) {
  await openApp(page)
  await createSolvedRoof(
    page,
    [
      [0.2, 0.2],
      [0.38, 0.2],
      [0.29, 0.38],
    ],
    [3, 5, 7],
  )
  await createSolvedRoof(
    page,
    [
      [0.62, 0.3],
      [0.8, 0.3],
      [0.71, 0.48],
    ],
    [4, 6, 8],
  )
  await expect(page.locator('.footprint-list-item')).toHaveCount(2)
}

test('Ctrl-click selects two roofs and aggregates their daily production capacity', async ({ page }) => {
  await createTwoSolvedRoofs(page)

  const roofs = page.locator('.footprint-list-item')
  await roofs.first().click()
  await roofs.nth(1).click({ modifiers: ['Control'] })

  await expect(page.locator('.footprint-list-item-selected')).toHaveCount(2)
  await expect(page.getByTestId('sun-daily-power')).toHaveText('Weighted capacity: 8.6 kWp')
})

test('Ctrl+A selects every roof and aggregates their daily production capacity', async ({ page }) => {
  await createTwoSolvedRoofs(page)

  await page.locator('.footprint-list-item').first().click()
  await page.keyboard.press('Control+A')

  await expect(page.locator('.footprint-list-item-selected')).toHaveCount(2)
  await expect(page.getByTestId('sun-daily-power')).toHaveText('Weighted capacity: 8.6 kWp')
})
