import { useCallback, useRef, useState } from 'react'
import type { PlaceSearchResult } from '../features/place-search/placeSearch.types'

interface MapNavigationTarget {
  id: number
  lon: number
  lat: number
}

interface UseMapNavigationTargetResult {
  mapNavigationTarget: MapNavigationTarget | null
  onPlaceSearchSelect: (result: PlaceSearchResult) => void
}

export function useMapNavigationTarget(): UseMapNavigationTargetResult {
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

  return {
    mapNavigationTarget,
    onPlaceSearchSelect,
  }
}
