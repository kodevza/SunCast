import { expect, type Page } from '@playwright/test'

export interface StoredProject {
  footprints: Record<
    string,
    {
      id: string
      polygon: Array<[number, number]>
      vertexHeights: Record<string, number>
    }
  >
  activeFootprintId: string | null
  solverConfigVersion?: string
}

export async function prepareCleanState(page: Page) {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('suncast_e2e_initialized') === '1') {
      return
    }
    window.sessionStorage.setItem('suncast_e2e_initialized', '1')
    window.localStorage.clear()
    window.localStorage.setItem(
      'suncast_uc12_tutorial_state',
      JSON.stringify({
        completedSteps: 6,
        tutorialEnabled: false,
      }),
    )
  })
}

export async function mockWarsawSearch(page: Page) {
  await page.route('https://photon.komoot.io/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            geometry: { coordinates: [21.0122, 52.2297] },
            properties: {
              street: 'Marszalkowska',
              housenumber: '10',
              city: 'Warsaw',
              country: 'Poland',
            },
          },
        ],
      }),
    })
  })
}

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('map-canvas')).toBeVisible()
}

export async function searchLocation(page: Page, query: string) {
  await page.getByTestId('place-search-input').fill(query)
  await expect(page.getByTestId('place-search-result-0')).toBeVisible()
  await page.getByTestId('place-search-result-0').click()
}

export async function openSunTools(page: Page) {
  const toggle = page.getByTestId('sun-overlay-toggle')
  if (await page.getByTestId('sun-overlay-tab-tools').count()) {
    return
  }
  await toggle.click()
  await expect(page.getByTestId('sun-overlay-tab-tools')).toBeVisible()
}

export async function openAnnualSunAccessTab(page: Page) {
  await openSunTools(page)
  await page.getByTestId('sun-overlay-tab-annual').click()
  await expect(page.getByTestId('annual-sun-access-panel')).toBeVisible()
}

export async function readStoredProject(page: Page): Promise<StoredProject> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('suncast_project')
    if (!raw) {
      throw new Error('suncast_project is missing in localStorage')
    }
    return JSON.parse(raw) as StoredProject
  })
}
