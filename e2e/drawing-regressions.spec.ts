import { expect, test } from './fixtures/coverage'
import { openApp, prepareCleanState } from './helpers/app-helpers'
import { drawRoof, getMapBounds } from './helpers/drawing-helpers'

test.beforeEach(async ({ page }) => {
  await prepareCleanState(page)
})

test('drawing regressions stay deterministic and commit-driven', async ({ page }) => {
  await page.route('**/__roof-keepalive__', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    await route.fulfill({ status: 204, body: '' })
  })
  await page.addInitScript(() => {
    window.setInterval(() => {
      void fetch('/__roof-keepalive__', { cache: 'no-store' }).catch(() => undefined)
    }, 100)
  })

  await openApp(page)
  await drawRoof(page, [
    [0.3, 0.2],
    [0.62, 0.26],
    [0.46, 0.62],
  ])
  await expect(page.getByTestId('vertex-height-input-0')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('map-canvas')).toBeVisible()

  await page.getByTestId('draw-footprint-button').click()
  const mapCanvas = page.getByTestId('map-canvas')
  const bounds = await getMapBounds(page)

  await mapCanvas.click({
    position: { x: bounds.width * 0.25, y: bounds.height * 0.25 },
    force: true,
  })

  await mapCanvas.hover({
    position: { x: bounds.width * 0.6, y: bounds.height * 0.45 },
    force: true,
  })

  const drawLabel = page.getByTestId('map-draw-angle-label')
  const lengthInput = page.getByTestId('map-draw-length-input')
  await expect(drawLabel).toBeVisible()
  await expect(lengthInput).toBeVisible()
  await expect(page.getByTestId('draw-finish-button')).toBeDisabled()

  await page.keyboard.press('Tab')
  await expect(lengthInput).toBeFocused()
  await page.keyboard.type('4.5')
  await page.keyboard.press('Enter')
  await expect(lengthInput).toHaveValue('')
  await expect(page.getByTestId('draw-finish-button')).toBeDisabled()

  await mapCanvas.hover({
    position: { x: bounds.width * 0.75, y: bounds.height * 0.35 },
    force: true,
  })
  await lengthInput.fill('6')

  await mapCanvas.click({
    position: { x: bounds.width * 0.75, y: bounds.height * 0.35 },
    force: true,
  })
  await expect(lengthInput).toHaveValue('')
  await expect(page.getByTestId('draw-finish-button')).toBeEnabled()
})
