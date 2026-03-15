import { expect, type Page } from '@playwright/test'

type MapRatioPoint = [number, number]

export async function getMapBounds(page: Page) {
  const mapCanvas = page.getByTestId('map-canvas')
  await expect(mapCanvas).toBeVisible()
  const bounds = await mapCanvas.boundingBox()
  if (!bounds) {
    throw new Error('Map canvas bounds are not available')
  }
  return bounds
}

export async function clickMapRatios(page: Page, points: MapRatioPoint[]) {
  const mapCanvas = page.getByTestId('map-canvas')
  const bounds = await getMapBounds(page)
  for (const [xRatio, yRatio] of points) {
    await mapCanvas.click({
      position: { x: bounds.width * xRatio, y: bounds.height * yRatio },
      force: true,
    })
    await page.waitForTimeout(50)
  }
}

export async function moveMouseToMapRatio(page: Page, point: MapRatioPoint) {
  const bounds = await getMapBounds(page)
  await page.mouse.move(bounds.x + bounds.width * point[0], bounds.y + bounds.height * point[1])
}

async function skipTutorialIfNeeded(page: Page) {
  const skipTutorialButton = page.getByRole('button', { name: 'Skip tutorial' })
  if (await skipTutorialButton.isVisible()) {
    await skipTutorialButton.click()
  }
}

export async function drawRoof(page: Page, points: MapRatioPoint[]) {
  await skipTutorialIfNeeded(page)
  await page.getByTestId('draw-footprint-button').click()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await clickMapRatios(page, points)
    if (await page.getByTestId('draw-finish-button').isEnabled()) {
      break
    }
  }
  await expect(page.getByTestId('draw-finish-button')).toBeEnabled()
  await page.getByTestId('draw-finish-button').click()
  await expect(page.getByTestId('vertex-height-input-0')).toBeVisible()
}

export async function drawObstacle(page: Page, points: MapRatioPoint[]) {
  await skipTutorialIfNeeded(page)
  await page.getByRole('button', { name: 'Obstacle Mode' }).click()
  await page.getByTestId('draw-obstacle-button').click()
  await expect(page.getByTestId('draw-obstacle-cancel-button')).toBeVisible()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await clickMapRatios(page, points)
    const finishButton = page.getByTestId('draw-obstacle-finish-button')
    if ((await finishButton.count()) > 0 && (await finishButton.isEnabled())) {
      break
    }
  }
  const finishButton = page.getByTestId('draw-obstacle-finish-button')
  if ((await finishButton.count()) > 0) {
    await expect(finishButton).toBeEnabled()
    await finishButton.click()
  }
  await expect(page.getByText('No obstacles yet.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Roof Mode' }).click()
}

export async function dragMapAtRatio(page: Page, from: MapRatioPoint, deltaPx: [number, number]) {
  const bounds = await getMapBounds(page)
  const fromX = bounds.x + bounds.width * from[0]
  const fromY = bounds.y + bounds.height * from[1]
  await page.mouse.move(fromX, fromY)
  await page.mouse.down()
  await page.mouse.move(fromX + deltaPx[0], fromY + deltaPx[1], { steps: 8 })
  await page.mouse.up()
}

async function addLengthConstrainedVertex(page: Page, point: MapRatioPoint, lengthM: number) {
  const mapCanvas = page.getByTestId('map-canvas')
  const bounds = await getMapBounds(page)
  await mapCanvas.hover({
    position: { x: bounds.width * point[0], y: bounds.height * point[1] },
    force: true,
  })
  const lengthInput = page.getByTestId('map-draw-length-input')
  await expect(lengthInput).toBeVisible()
  await lengthInput.click()
  await lengthInput.fill(String(lengthM))
  await lengthInput.press('Enter')
  if ((await lengthInput.inputValue()) !== '') {
    await mapCanvas.click({
      position: { x: bounds.width * point[0], y: bounds.height * point[1] },
      force: true,
    })
    await lengthInput.focus()
    await page.keyboard.press('Enter')
  }
}

export async function drawRoofSizedRectangle(page: Page, widthM: number, heightM: number) {
  await skipTutorialIfNeeded(page)
  await page.getByTestId('draw-footprint-button').click()
  const mapCanvas = page.getByTestId('map-canvas')
  const bounds = await getMapBounds(page)

  await mapCanvas.click({
    position: { x: bounds.width * 0.35, y: bounds.height * 0.35 },
    force: true,
  })
  await addLengthConstrainedVertex(page, [0.45, 0.35], widthM)
  await addLengthConstrainedVertex(page, [0.45, 0.45], heightM)
  await addLengthConstrainedVertex(page, [0.35, 0.45], widthM)

  await expect(page.getByTestId('draw-finish-button')).toBeEnabled()
  await page.getByTestId('draw-finish-button').click()
  await expect(page.getByTestId('vertex-height-input-0')).toBeVisible()
}

export async function drawObstacleSizedRectangle(page: Page) {
  await skipTutorialIfNeeded(page)
  await page.getByRole('button', { name: 'Obstacle Mode' }).click()
  await page.getByTestId('draw-obstacle-button').click()
  await clickMapRatios(page, [
    [0.38, 0.38],
    [0.395, 0.38],
    [0.395, 0.395],
    [0.38, 0.395],
  ])

  await expect(page.getByTestId('draw-obstacle-finish-button')).toBeEnabled()
  await page.getByTestId('draw-obstacle-finish-button').click()
  await expect(page.getByText('No obstacles yet.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Roof Mode' }).click()
}
