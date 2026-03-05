import { expect, test } from './fixtures/coverage'
import type { Page } from '@playwright/test'
import { countChangedPixels, readPngSize } from './utils/imageDiff'

async function drawTriangleFootprint(page: Page) {
  await page.getByTestId('draw-footprint-button').click()
  const mapCanvas = page.getByTestId('map-canvas')
  await expect(mapCanvas).toBeVisible()

  const bounds = await mapCanvas.boundingBox()
  if (!bounds) {
    throw new Error('Map canvas bounds are not available')
  }

  const points: Array<[number, number]> = [
    [0.3, 0.2],
    [0.62, 0.26],
    [0.46, 0.62],
  ]
  for (const [xRatio, yRatio] of points) {
    await page.mouse.click(bounds.x + bounds.width * xRatio, bounds.y + bounds.height * yRatio)
  }

  await expect(page.getByTestId('draw-finish-button')).toBeEnabled()
  await page.getByTestId('draw-finish-button').click()
  await expect(page.getByTestId('vertex-height-input-0')).toBeVisible()
}

test('sets 3 vertex heights and rotates orbit map', async ({ page }, testInfo) => {
  const mapPitchValues: number[] = []
  const rotateValues: number[] = []

  page.on('console', async (msg) => {
    for (const arg of msg.args()) {
      try {
        const value = await arg.jsonValue()
        if (
          value &&
          typeof value === 'object' &&
          'mapPitchDeg' in value &&
          typeof (value as { mapPitchDeg: unknown }).mapPitchDeg === 'number'
        ) {
          mapPitchValues.push((value as { mapPitchDeg: number }).mapPitchDeg)
        }
        if (value && typeof value === 'object' && 'rotateDeg' in value && typeof (value as { rotateDeg: unknown }).rotateDeg === 'number') {
          rotateValues.push((value as { rotateDeg: number }).rotateDeg)
        }
      } catch {
        // Ignore values that cannot be serialized from browser context.
      }
    }
  })

  await page.goto('/')
  await drawTriangleFootprint(page)

  const heights = [2, 4, 30]
  for (let i = 0; i < heights.length; i += 1) {
    await page.getByTestId(`vertex-height-input-${i}`).fill(String(heights[i]))
    await page.getByTestId(`vertex-height-set-${i}`).click()
    await expect(page.getByTestId(`vertex-height-clear-${i}`)).toBeEnabled()
  }
  await expect(page.getByText(/Active constraints:/)).toContainText('V0=2.00m')
  await expect(page.getByText(/Active constraints:/)).toContainText('V1=4.00m')
  await expect(page.getByText(/Active constraints:/)).toContainText('V2=30.00m')

  await expect(page.getByText('CONSTRAINTS_INSUFFICIENT')).toHaveCount(0)
  await expect(page.getByText(/^Pitch:/)).toBeVisible()

  await page.getByTestId('orbit-toggle-button').click()
  await expect(page.getByTestId('orbit-toggle-button')).toHaveText(/Exit orbit/i)
  await expect(page.getByTestId('map-rotate-left-button')).toBeVisible()
  await expect(page.getByTestId('map-rotate-right-button')).toBeVisible()

  await page.getByTestId('map-rotate-right-button').click()
  await page.getByTestId('map-rotate-right-button').click()
  await page.getByTestId('map-pitch-up-button').click()

  await expect
    .poll(() => mapPitchValues.some((value) => Math.abs(value) > 0.5), { timeout: 10_000 })
    .toBeTruthy()
  await expect
    .poll(() => {
      const rotateSpan = rotateValues.length > 0 ? Math.max(...rotateValues) - Math.min(...rotateValues) : 0
      return Math.abs(rotateSpan)
    }, { timeout: 10_000 })
    .toBeGreaterThan(3)

  const debugToggle = page.getByTestId('debug-overlay-toggle-button')
  await expect(debugToggle).toHaveText(/Hide debug/i)
  const debugOnScreenshot = await page.getByTestId('map-canvas').screenshot({ animations: 'disabled' })
  await testInfo.attach('debug-on-map', {
    body: debugOnScreenshot,
    contentType: 'image/png',
  })

  const { width, height } = readPngSize(debugOnScreenshot)
  const roi = {
    x: Math.floor(width * 0.08),
    y: Math.floor(height * 0.12),
    width: Math.floor(width * 0.84),
    height: Math.floor(height * 0.8),
  }

  await debugToggle.click()
  await expect(debugToggle).toHaveText(/Show debug/i)
  await page.waitForTimeout(250)

  const debugOffScreenshot = await page.getByTestId('map-canvas').screenshot({ animations: 'disabled' })
  await testInfo.attach('debug-off-map', {
    body: debugOffScreenshot,
    contentType: 'image/png',
  })

  const changedPixels = await countChangedPixels(page, debugOnScreenshot, debugOffScreenshot, { roi })
  await testInfo.attach('debug-overlay-diff-metrics', {
    body: Buffer.from(JSON.stringify({ changedPixels, roi, width, height }, null, 2), 'utf8'),
    contentType: 'application/json',
  })
  expect(changedPixels).toBeGreaterThan(2_000)
})

test('draw finish should not depend on map network becoming idle', async ({ page }) => {
  await page.route('**/__roof-debug-keepalive__', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    await route.fulfill({ status: 204, body: '' })
  })
  await page.addInitScript(() => {
    window.setInterval(() => {
      void fetch('/__roof-debug-keepalive__', { cache: 'no-store' }).catch(() => undefined)
    }, 100)
  })

  await page.goto('/')
  await drawTriangleFootprint(page)
  await expect(page.getByTestId('vertex-height-input-0')).toBeVisible()
})
