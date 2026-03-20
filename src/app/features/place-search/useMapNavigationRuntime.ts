import { useCallback, useMemo, useRef, useState } from 'react'
import type { PlaceSearchResult } from './placeSearch.types'

export interface MapNavigationTarget {
  id: number
  lon: number
  lat: number
}

export interface MapNavigationRuntime {
  mapNavigationTarget: MapNavigationTarget | null
  onPlaceSearchSelect: (result: PlaceSearchResult) => void
}

export function useMapNavigationRuntime(): MapNavigationRuntime {
  const [mapNavigationTarget, setMapNavigationTarget] = useState<MapNavigationTarget | null>(null)
  const mapNavigationIdRef = useRef(0)

  const onPlaceSearchSelect = useCallback((result: PlaceSearchResult) => {
    mapNavigationIdRef.current += 1
    setMapNavigationTarget({
      id: mapNavigationIdRef.current,
      lat: result.lat,
      lon: result.lon,
    })
  }, [])

  return useMemo(
    () => ({
      mapNavigationTarget,
      onPlaceSearchSelect,
    }),
    [mapNavigationTarget, onPlaceSearchSelect],
  )
}
