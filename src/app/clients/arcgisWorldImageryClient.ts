export interface ArcgisWorldImageryMetadataResponse {
  attribution?: unknown
  copyrightText?: unknown
}

interface ArcgisWorldImageryMetadataArgs {
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

const ARCGIS_WORLD_IMAGERY_METADATA_URL =
  'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer?f=pjson'

export async function getArcgisWorldImageryMetadata({
  signal,
  fetchImpl = fetch,
}: ArcgisWorldImageryMetadataArgs = {}): Promise<ArcgisWorldImageryMetadataResponse> {
  const response = await fetchImpl(ARCGIS_WORLD_IMAGERY_METADATA_URL, { signal })
  if (!response.ok) {
    throw new Error(`ArcGIS metadata request failed with status ${response.status}`)
  }

  return (await response.json()) as ArcgisWorldImageryMetadataResponse
}
