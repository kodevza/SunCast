import { expect, type Page } from '@playwright/test'
import { drawRoof } from './drawing-helpers'

export async function expandEdgeHeightsIfCollapsed(page: Page) {
  const edgeInput = page.getByTestId('edge-height-input-0')
  if (await edgeInput.isVisible()) {
    return
  }
  await page.locator('summary').filter({ hasText: 'Edge Heights' }).click()
  await expect(edgeInput).toBeVisible()
}

export async function setEdgeHeight(page: Page, edgeIndex: number, heightM: number) {
  await expandEdgeHeightsIfCollapsed(page)
  await page.getByTestId(`edge-height-input-${edgeIndex}`).fill(String(heightM))
  await page.getByTestId(`edge-height-set-${edgeIndex}`).click()
}

export async function setVertexHeight(page: Page, vertexIndex: number, heightM: number) {
  const input = page.getByTestId(`vertex-height-input-${vertexIndex}`)
  const setButton = page.getByTestId(`vertex-height-set-${vertexIndex}`)
  const clearButton = page.getByTestId(`vertex-height-clear-${vertexIndex}`)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await input.fill(String(heightM))
    await setButton.click()
    if (await clearButton.isEnabled()) {
      break
    }
  }
  await expect(clearButton).toBeEnabled()
}

export async function createSolvedRoof(page: Page, points: Array<[number, number]>, heights: number[]) {
  await drawRoof(page, points)
  for (let i = 0; i < heights.length; i += 1) {
    await setVertexHeight(page, i, heights[i])
  }
  await expect(page.getByTestId('status-pitch-value')).toBeVisible()
}

export async function setSunDatetime(page: Page, datetimeIso: string) {
  await page.getByTestId('sun-datetime-input').fill(datetimeIso)
}

export async function enterOrbitMode(page: Page) {
  const orbitButton = page.getByTestId('orbit-toggle-button')
  if ((await orbitButton.innerText()) === 'Orbit') {
    await orbitButton.click()
  }
  await expect(orbitButton).toHaveText(/Exit orbit/i)
}
