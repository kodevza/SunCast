import { describe, expect, it } from 'vitest'
import { resolvePvgisGatewayApiBaseUrl } from './pvgisClient'

describe('PVGIS browser gateway configuration', () => {
  it('accepts the API Management API base URL and strips a trailing slash', () => {
    expect(resolvePvgisGatewayApiBaseUrl('https://suncast-pvgis-apim.azure-api.net/api/v5_3/'))
      .toBe('https://suncast-pvgis-apim.azure-api.net/api/v5_3')
  })

  it.each([
    undefined,
    'http://suncast-pvgis-apim.azure-api.net/api/v5_3',
    'https://suncast-pvgis-apim.azure-api.net/api/v5_2',
    'https://suncast-pvgis-apim.azure-api.net/api/v5_3?debug=true',
  ])('rejects an invalid browser gateway URL: %s', (url) => {
    expect(() => resolvePvgisGatewayApiBaseUrl(url)).toThrow()
  })
})
