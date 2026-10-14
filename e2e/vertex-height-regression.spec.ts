import { expect, test } from './fixtures/coverage'
import { openApp, prepareCleanState } from './helpers/app-helpers'
import { drawRoof } from './helpers/drawing-helpers'
import { setVertexHeight } from './helpers/editor-helpers'

test.beforeEach(async ({ page }) => {
  await prepareCleanState(page)
})

test('vertex controls remain available after a roof becomes solved', async ({ page }) => {
  await openApp(page)
  await drawRoof(page, [
    [0.22, 0.21],
    [0.44, 0.22],
    [0.34, 0.46],
  ])
  await setVertexHeight(page, 0, 3)
  await setVertexHeight(page, 1, 5)
  await page.getByTestId('vertex-height-input-2').fill('8')
  await page.getByTestId('vertex-height-set-2').click()
  await expect(page.getByTestId('vertex-height-clear-2')).toBeEnabled({ timeout: 5_000 })
})
