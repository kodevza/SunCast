import { readFileSync } from 'node:fs'

export function resolvePvgisGatewayUrl(compiledParameters) {
  const parameters = JSON.parse(compiledParameters.parametersJson)
  const serviceName = parameters.parameters?.serviceName?.value
  if (typeof serviceName !== 'string' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(serviceName)) {
    throw new Error('Bicep parameter serviceName is missing or invalid')
  }
  return `https://${serviceName}.azure-api.net/api/v5_3`
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const compiledParameters = JSON.parse(readFileSync(0, 'utf8'))
  process.stdout.write(`VITE_PVGIS_GATEWAY_URL=${resolvePvgisGatewayUrl(compiledParameters)}\n`)
}
