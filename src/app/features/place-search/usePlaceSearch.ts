import { useEffect, useMemo, useRef, useState } from 'react'
import { PhotonPlaceSearchProvider } from './providers/photonPlaceSearchProvider'
import type { PlaceSearchProvider, PlaceSearchResult } from './placeSearch.types'
import { captureException, recordEvent } from '../../../shared/observability/observability'
import { reportAppErrorCode } from '../../../shared/errors'

const QUERY_MIN_LENGTH = 3
const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_LIMIT = 5
const SUPPORTED_LANGS = new Set(['de', 'en', 'fr'])
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000

interface CachedSearchResult {
  results: PlaceSearchResult[]
  fetchedAtMs: number
}

interface UsePlaceSearchArgs {
  query: string
  provider?: PlaceSearchProvider
  debounceMs?: number
}

interface UsePlaceSearchResult {
  results: PlaceSearchResult[]
  loading: boolean
  error: string | null
  hasSearched: boolean
}

const defaultProvider = new PhotonPlaceSearchProvider()
const searchCache = new Map<string, CachedSearchResult>()

function resolveProviderLang(locale: string): string | undefined {
  const normalized = locale.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }

  const baseLang = normalized.split('-')[0]
  if (SUPPORTED_LANGS.has(baseLang)) {
    return baseLang
  }

  return undefined
}

export function usePlaceSearch({
  query,
  provider,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UsePlaceSearchArgs): UsePlaceSearchResult {
  const normalizedQuery = query.trim()
  const searchProvider = useMemo(() => provider ?? defaultProvider, [provider])
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const lastReportedErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (normalizedQuery.length < QUERY_MIN_LENGTH) {
      abortRef.current?.abort()
      abortRef.current = null
      setResults([])
      setLoading(false)
      setError(null)
      setHasSearched(false)
      lastReportedErrorRef.current = null
      return
    }

    const cacheKey = `${resolveProviderLang(navigator.language) ?? 'default'}|${normalizedQuery.toLowerCase()}`
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.fetchedAtMs <= SEARCH_CACHE_TTL_MS) {
      setResults(cached.results)
      setLoading(false)
      setError(null)
      setHasSearched(true)
      lastReportedErrorRef.current = null
      recordEvent('place-search.cache_hit', { queryLength: normalizedQuery.length })
      return
    }

    const timeoutId = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)

      try {
        const nextResults = await searchProvider.search(normalizedQuery, {
          limit: DEFAULT_LIMIT,
          lang: resolveProviderLang(navigator.language),
          signal: controller.signal,
        })
        if (!controller.signal.aborted) {
          const limitedResults = nextResults.slice(0, DEFAULT_LIMIT)
          searchCache.set(cacheKey, { results: limitedResults, fetchedAtMs: Date.now() })
          setResults(limitedResults)
          setHasSearched(true)
        }
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return
        }
        setResults([])
        const message = caughtError instanceof Error ? caughtError.message : 'Search failed'
        setError(message)
        if (lastReportedErrorRef.current !== message) {
          reportAppErrorCode('PLACE_SEARCH_FAILED', message, {
            cause: caughtError,
            context: { area: 'place-search-hook', hasCache: Boolean(cached), enableStateReset: true },
          })
          lastReportedErrorRef.current = message
        }
        setHasSearched(true)
        captureException(caughtError, { area: 'place-search-hook', hasCache: String(Boolean(cached)) })
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [debounceMs, normalizedQuery, searchProvider])

  return { results, loading, error, hasSearched }
}
