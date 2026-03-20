import { useState, type Dispatch, type SetStateAction } from 'react'

export interface MapViewRuntime {
  orbitEnabled: boolean
  setOrbitEnabled: Dispatch<SetStateAction<boolean>>
  mapInitialized: boolean
  setMapInitialized: Dispatch<SetStateAction<boolean>>
  mapBearingDeg: number
  setMapBearingDeg: Dispatch<SetStateAction<number>>
  mapPitchDeg: number
  setMapPitchDeg: Dispatch<SetStateAction<number>>
}

export function useMapViewRuntime(): MapViewRuntime {
  const [orbitEnabled, setOrbitEnabled] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [mapBearingDeg, setMapBearingDeg] = useState(0)
  const [mapPitchDeg, setMapPitchDeg] = useState(0)

  return {
    orbitEnabled,
    setOrbitEnabled,
    mapInitialized,
    setMapInitialized,
    mapBearingDeg,
    setMapBearingDeg,
    mapPitchDeg,
    setMapPitchDeg,
  }
}
