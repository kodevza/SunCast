import { useEffect, useRef, useState, type RefObject } from 'react'
import type maplibregl from 'maplibre-gl'
import { MAX_ORBIT_PITCH_DEG } from '../mapViewConstants'
import { createMapStyle } from '../createMapStyle'
import { parseMapCenterFromHash } from '../mapCenterFromHash'
import { useLatest } from '../useLatest'
import { reportAppErrorCode } from '../../../../../shared/errors'
import { createMapRuntime, startLoadTimeout } from './mapRuntime'

interface UseMapInstanceArgs {
  onInitialized?: () => void
}

interface UseMapInstanceResult {
  containerRef: RefObject<HTMLDivElement | null>
  mapRef: RefObject<maplibregl.Map | null>
  mapLoaded: boolean
}

export function useMapInstance({ onInitialized }: UseMapInstanceArgs): UseMapInstanceResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapLoadedRef = useRef(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const hasReportedMapInitErrorRef = useRef(false)
  const onInitializedRef = useLatest(onInitialized)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const initialCenter = parseMapCenterFromHash(window.location.hash) ?? [20.8094, 52.1677]

    const runtime = createMapRuntime({
      container: containerRef.current,
      style: createMapStyle(),
      center: initialCenter,
      maxPitchDeg: MAX_ORBIT_PITCH_DEG,
    })

    const { map } = runtime

    const handleLoad = () => {
      mapLoadedRef.current = true
      setMapLoaded(true)
      onInitializedRef.current?.()
    }

    const handleError = (event: { error?: Error }) => {
      if (!mapLoadedRef.current && event.error) {
        if (!hasReportedMapInitErrorRef.current) {
          hasReportedMapInitErrorRef.current = true
          reportAppErrorCode('MAP_INIT_FAILED', 'Map failed to load.', {
            cause: event.error,
            context: { area: 'map-view', reason: 'maplibre-load-error', enableStateReset: true },
          })
        }
      }
    }

    const stopLoadTimeout = startLoadTimeout(12000, () => {
      if (!mapLoadedRef.current) {
        if (!hasReportedMapInitErrorRef.current) {
          hasReportedMapInitErrorRef.current = true
          reportAppErrorCode('MAP_INIT_FAILED', 'Map load timed out.', {
            context: { area: 'map-view', reason: 'maplibre-load-timeout', enableStateReset: true },
          })
        }
      }
    })

    map.on('load', handleLoad)
    map.on('error', handleError)
    mapRef.current = map

    return () => {
      stopLoadTimeout()
      map.off('load', handleLoad)
      map.off('error', handleError)
      runtime.dispose()
      mapRef.current = null
      mapLoadedRef.current = false
      setMapLoaded(false)
      hasReportedMapInitErrorRef.current = false
    }
  }, [onInitializedRef])

  return { containerRef, mapRef, mapLoaded }
}
