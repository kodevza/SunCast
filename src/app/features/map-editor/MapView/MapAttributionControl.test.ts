import { describe, expect, it } from 'vitest'
import { getMapAttributionText } from './mapAttributionText'

describe('getMapAttributionText', () => {
  it('returns the required OSM attribution wording for streets basemap', () => {
    expect(getMapAttributionText('streets', 'ignored')).toBe('© OpenStreetMap contributors')
  })

  it('uses dynamic ArcGIS provider attribution when available', () => {
    expect(getMapAttributionText('satellite', 'Example Provider Attribution')).toBe(
      'Powered by Esri | Example Provider Attribution',
    )
  })

  it('keeps ArcGIS attribution discoverable when provider attribution is unavailable', () => {
    expect(getMapAttributionText('satellite', null)).toBe('Powered by Esri')
  })
})
