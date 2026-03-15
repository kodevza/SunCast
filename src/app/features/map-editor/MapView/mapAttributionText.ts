export function getMapAttributionText(
  basemapMode: 'satellite' | 'streets',
  arcgisProviderAttribution: string | null,
): string {
  if (basemapMode === 'streets') {
    return '© OpenStreetMap contributors'
  }
  return arcgisProviderAttribution ? `Powered by Esri | ${arcgisProviderAttribution}` : 'Powered by Esri'
}
