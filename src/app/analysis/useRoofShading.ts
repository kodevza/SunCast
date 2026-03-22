import { useEffect, useMemo, useRef, useState } from 'react'
import { computeRoofShadeGrid, type ComputeRoofShadeGridInput, type ComputeRoofShadeGridResult } from '../../geometry/shading'
import type { RoofShadeDiagnosticsResults, ShadingRoofInput } from '../../geometry/shading/types'
import { toShadingObstacleVolume } from '../../geometry/obstacles/obstacleModels'
import type { ObstacleStateEntry } from '../../types/geometry'
import { buildObstacleGeometryCacheKey, buildRoofGeometryCacheKey } from '../../shared/utils/shadingCacheKey'
import type { RoofShadingComputeState } from './analysis.types'

export type { RoofShadingComputeState } from './analysis.types'

export interface RoofShadingResult {
  readyResult: ComputeRoofShadeGridResult | null
  computeState: RoofShadingComputeState
  computeMode: 'final' | 'coarse'
  resultStatus: ComputeRoofShadeGridResult['status'] | null
  statusMessage: string | null
  diagnostics: RoofShadeDiagnosticsResults | null
  usedGridResolutionM: number | null
}

interface RoofShadingRequest {
  payload: ComputeRoofShadeGridInput
  key: string
  cacheRevision: number
  computeMode: 'final' | 'coarse'
  usedGridResolutionM: number
}

interface RoofShadingState {
  readyKey: string | null
  readyResult: ComputeRoofShadeGridResult | null
  computeMode: 'final' | 'coarse'
  resultStatus: ComputeRoofShadeGridResult['status'] | null
  statusMessage: string | null
  diagnostics: RoofShadeDiagnosticsResults | null
  usedGridResolutionM: number | null
}

export interface UseRoofShadingArgs {
  cacheRevision: number
  enabled: boolean
  roofs: ShadingRoofInput[]
  obstacles: ObstacleStateEntry[]
  datetimeIso: string | null
  gridResolutionM: number
  interactionActive: boolean
  interactionThrottleMs?: number
}

const roofShadingResultCache = new Map<string, ComputeRoofShadeGridResult>()
const DEFAULT_INTERACTION_THROTTLE_MS = 100
const MIN_COARSE_GRID_RESOLUTION_M = 0.9
const MAX_INTERACTION_SAMPLE_COUNT = 3500
const SHADE_CACHE_LIMIT_RECENT = 4

function createCacheRequestKey(request: RoofShadingRequest): string {
  const roofGeometryKey = buildRoofGeometryCacheKey(request.payload.roofs)
  const obstacleGeometryKey = buildObstacleGeometryCacheKey(request.payload.obstacles)

  return [
    String(request.cacheRevision),
    request.computeMode,
    request.payload.datetimeIso,
    request.payload.gridResolutionM.toFixed(4),
    String(request.payload.maxSampleCount ?? ''),
    request.payload.sampleOverflowStrategy ?? '',
    roofGeometryKey,
    obstacleGeometryKey,
  ].join('::')
}

function cacheResult(key: string, result: ComputeRoofShadeGridResult): void {
  roofShadingResultCache.set(key, result)
  if (roofShadingResultCache.size <= SHADE_CACHE_LIMIT_RECENT) {
    return
  }

  const oldestKey = roofShadingResultCache.keys().next().value
  if (typeof oldestKey === 'string') {
    roofShadingResultCache.delete(oldestKey)
  }
}

function makeRequest({
  cacheRevision,
  enabled,
  datetimeIso,
  roofs,
  obstacles,
  gridResolutionM,
  interactionActive,
}: Pick<
  UseRoofShadingArgs,
  'cacheRevision' | 'enabled' | 'datetimeIso' | 'roofs' | 'obstacles' | 'gridResolutionM' | 'interactionActive'
>): RoofShadingRequest | null {
  if (!enabled || !datetimeIso || roofs.length === 0 || gridResolutionM <= 0) {
    return null
  }

  const computeMode = interactionActive ? ('coarse' as const) : ('final' as const)
  const usedGridResolutionM =
    computeMode === 'coarse'
      ? Math.max(MIN_COARSE_GRID_RESOLUTION_M, gridResolutionM * 1.9)
      : gridResolutionM
  const maxSampleCount = computeMode === 'coarse' ? MAX_INTERACTION_SAMPLE_COUNT : undefined

  const payload: ComputeRoofShadeGridInput = {
    datetimeIso,
    roofs,
    obstacles: obstacles.map(toShadingObstacleVolume),
    gridResolutionM: usedGridResolutionM,
    maxSampleCount,
    sampleOverflowStrategy: 'auto-increase',
  }

  const provisionalRequest: RoofShadingRequest = {
    payload,
    cacheRevision,
    computeMode,
    usedGridResolutionM,
    key: '',
  }

  return {
    ...provisionalRequest,
    key: createCacheRequestKey(provisionalRequest),
  }
}

const IDLE_RESULT: RoofShadingResult = {
  readyResult: null,
  computeState: 'IDLE',
  computeMode: 'final',
  resultStatus: null,
  statusMessage: null,
  diagnostics: null,
  usedGridResolutionM: null,
}

const IDLE_STATE: RoofShadingState = {
  readyKey: null,
  readyResult: null,
  computeMode: 'final',
  resultStatus: null,
  statusMessage: null,
  diagnostics: null,
  usedGridResolutionM: null,
}

export function useRoofShading(args: UseRoofShadingArgs): RoofShadingResult {
  const { cacheRevision, enabled, datetimeIso, roofs, obstacles, gridResolutionM, interactionActive } = args

  const interactionThrottleMs =
    Number.isFinite(args.interactionThrottleMs) && args.interactionThrottleMs !== undefined
      ? Math.max(20, args.interactionThrottleMs)
      : DEFAULT_INTERACTION_THROTTLE_MS

  const request = useMemo(
    () => makeRequest({ cacheRevision, enabled, datetimeIso, roofs, obstacles, gridResolutionM, interactionActive }),
    [cacheRevision, datetimeIso, enabled, gridResolutionM, interactionActive, obstacles, roofs],
  )
  const [store, setStore] = useState<RoofShadingState>(IDLE_STATE)
  const computeTokenRef = useRef(0)

  useEffect(() => {
    const computeToken = ++computeTokenRef.current
    if (!request) {
      return
    }

    const delayMs = interactionActive ? interactionThrottleMs : 0
    const timerId = window.setTimeout(() => {
      const cached = roofShadingResultCache.get(request.key)
      const computed = cached ?? computeRoofShadeGrid(request.payload)
      if (computeTokenRef.current !== computeToken) {
        return
      }

      if (!cached) {
        cacheResult(request.key, computed)
      }

      setStore({
        readyKey: request.key,
        readyResult: computed,
        computeMode: request.computeMode,
        resultStatus: computed.status,
        statusMessage: computed.statusMessage,
        diagnostics: computed.diagnostics,
        usedGridResolutionM: request.usedGridResolutionM,
      })
    }, delayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [interactionActive, interactionThrottleMs, request])

  if (!request) {
    return IDLE_RESULT
  }

  if (store.readyKey === null) {
    return {
      ...IDLE_RESULT,
      computeState: 'PENDING',
      computeMode: request.computeMode,
      usedGridResolutionM: request.usedGridResolutionM,
    }
  }

  const output = {
    readyResult: store.readyResult,
    resultStatus: store.resultStatus,
    statusMessage: store.statusMessage,
    diagnostics: store.diagnostics,
  }

  if (store.readyKey !== request.key) {
    return {
      readyResult: output.readyResult,
      computeState: 'STALE',
      computeMode: store.computeMode,
      resultStatus: output.resultStatus,
      statusMessage: output.statusMessage,
      diagnostics: output.diagnostics,
      usedGridResolutionM: store.usedGridResolutionM,
    }
  }

  return {
    readyResult: output.readyResult,
    computeState: 'READY',
    computeMode: store.computeMode,
    resultStatus: output.resultStatus,
    statusMessage: output.statusMessage,
    diagnostics: output.diagnostics,
    usedGridResolutionM: store.usedGridResolutionM ?? request.usedGridResolutionM,
  }
}
