import {
  fetchPvgisFixedAnnualYield as fetchPvgisFixedAnnualYieldFromProvider,
  type PvgisRoofEstimateInput,
} from '../../core'

/**
 * Browser transport boundary for PVGIS. Unlike the Node CLI, the browser must
 * never fall back to PVGIS directly: it uses the configured API Management
 * gateway configured at build time.
 */
export function resolvePvgisGatewayApiBaseUrl(value: string | undefined): string {
  const configuredValue = value?.trim()
  if (!configuredValue) {
    throw new Error('PVGIS gateway is not configured. Set VITE_PVGIS_GATEWAY_URL for this build.')
  }

  const url = new URL(configuredValue)
  if (url.protocol !== 'https:' || url.search || url.hash || !url.pathname.replace(/\/+$/, '').endsWith('/api/v5_3')) {
    throw new Error('VITE_PVGIS_GATEWAY_URL must be an HTTPS URL ending in /api/v5_3.')
  }
  return url.toString().replace(/\/+$/, '')
}

export async function fetchPvgisFixedAnnualYield(input: PvgisRoofEstimateInput) {
  return fetchPvgisFixedAnnualYieldFromProvider(input, {
    apiBaseUrl: resolvePvgisGatewayApiBaseUrl(import.meta.env.VITE_PVGIS_GATEWAY_URL),
  })
}
