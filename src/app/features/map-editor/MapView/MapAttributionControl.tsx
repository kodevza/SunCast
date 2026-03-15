import { getMapAttributionText } from './mapAttributionText'

interface MapAttributionControlProps {
  basemapMode: 'satellite' | 'streets'
  arcgisProviderAttribution: string | null
}

export function MapAttributionControl({ basemapMode, arcgisProviderAttribution }: MapAttributionControlProps) {
  const text = getMapAttributionText(basemapMode, arcgisProviderAttribution)

  return (
    <details className="map-attribution-control" open>
      <summary className="map-attribution-summary">Attribution</summary>
      <p className="map-attribution-text" data-testid="map-attribution-text">
        {basemapMode === 'streets' ? (
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        ) : (
          <>
            Powered by{' '}
            <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">
              Esri
            </a>
            {arcgisProviderAttribution ? ` | ${arcgisProviderAttribution}` : ''}
          </>
        )}
      </p>
    </details>
  )
}
