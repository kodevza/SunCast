import { describe, expect, it } from 'vitest'
import { createMapStyle } from './createMapStyle'
import {
  SATELLITE_LAYER_ID,
  SATELLITE_SOURCE_ID,
  STREETS_LAYER_ID,
  STREETS_SOURCE_ID,
  STREETS_SOURCE,
} from './mapViewConstants'

describe('createMapStyle', () => {
  it('registers satellite and streets basemaps in one style with satellite visible by default', () => {
    const style = createMapStyle()

    expect(style.sources[SATELLITE_SOURCE_ID]).toBeDefined()
    expect(style.sources[STREETS_SOURCE_ID]).toMatchObject(STREETS_SOURCE)

    const satelliteLayer = style.layers.find((layer) => layer.id === SATELLITE_LAYER_ID)
    const streetsLayer = style.layers.find((layer) => layer.id === STREETS_LAYER_ID)
    expect(satelliteLayer).toMatchObject({
      id: SATELLITE_LAYER_ID,
      type: 'raster',
      source: SATELLITE_SOURCE_ID,
      layout: { visibility: 'visible' },
    })
    expect(streetsLayer).toMatchObject({
      id: STREETS_LAYER_ID,
      type: 'raster',
      source: STREETS_SOURCE_ID,
      layout: { visibility: 'none' },
    })
  })

  it('does not register ground shading heatmap source or layer', () => {
    const style = createMapStyle()

    expect(style.sources['shading-heatmap']).toBeUndefined()
    expect(style.layers.some((layer) => layer.type === 'heatmap')).toBe(false)
  })
})
