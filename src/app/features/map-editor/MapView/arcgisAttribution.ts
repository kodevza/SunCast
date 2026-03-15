import { captureException, recordEvent } from '../../../../shared/observability/observability'
import { getArcgisWorldImageryMetadata } from '../../../clients/arcgisWorldImageryClient'

let cachedProviderAttribution: string | null | undefined
let inflightRequest: Promise<string | null> | null = null

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export async function fetchArcgisProviderAttribution(signal?: AbortSignal): Promise<string | null> {
  if (cachedProviderAttribution !== undefined) {
    return cachedProviderAttribution
  }

  if (!inflightRequest) {
    inflightRequest = (async () => {
      try {
        const payload = await getArcgisWorldImageryMetadata({ signal })
        const providerText = asNonEmptyString(payload.attribution) ?? asNonEmptyString(payload.copyrightText)
        if (!providerText) {
          recordEvent('map.arcgis_attribution_missing')
        }
        cachedProviderAttribution = providerText ?? null
        return cachedProviderAttribution
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        captureException(error, { area: 'map-view', source: 'arcgis-attribution' })
        cachedProviderAttribution = null
        return null
      } finally {
        inflightRequest = null
      }
    })()
  }

  return inflightRequest
}
