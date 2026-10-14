import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { describe, it } from 'vitest'

import { resolvePvgisGatewayUrl } from './resolve-pvgis-gateway-url.mjs'

describe('PVGIS gateway URL for Pages', () => {
  it('resolves the URL from the deployed Bicep service name', () => {
    const compiled = JSON.parse(execFileSync('az', [
      'bicep', 'build-params', '--file', 'infra/pvgis-apim/main.bicepparam', '--stdout',
    ], { encoding: 'utf8' }))

    assert.equal(
      resolvePvgisGatewayUrl(compiled),
      'https://suncast-pvgis-apim-prod.azure-api.net/api/v5_3',
    )
  }, 20_000)

  it('rejects a missing service name instead of building an unusable URL', () => {
    assert.throws(
      () => resolvePvgisGatewayUrl({ parametersJson: JSON.stringify({ parameters: {} }) }),
      /serviceName/,
    )
  })
})
