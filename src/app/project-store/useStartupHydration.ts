import { useEffect } from 'react'
import { readSharedStateFromHashResult } from '../globalServices/shareService'
import { captureException, recordEvent } from '../../shared/observability/observability'
import { createAppError, reportAppError } from '../../shared/errors'
import {
  DEFAULT_FOOTPRINT_KWP,
  DEFAULT_SHADING_SETTINGS,
  DEFAULT_SUN_PROJECTION,
} from '../../state/project-store/projectState.reducer'
import { readStorageResult } from '../../state/project-store/projectState.storage'
import type { Action } from '../../state/project-store/projectState.types'

type UseStartupHydrationParams = {
  dispatch: (action: Action) => void
  markHydrationFinished: () => void
  solverConfigVersion: string
}

function hasSharedStateParam(hash: string): boolean {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(normalizedHash).has('c')
}

export function useStartupHydration({
  dispatch,
  markHydrationFinished,
  solverConfigVersion,
}: UseStartupHydrationParams) {
  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const finishHydration = () => {
        if (!cancelled) {
          markHydrationFinished()
        }
      }

      if (hasSharedStateParam(window.location.hash)) {
        const shared = await readSharedStateFromHashResult(
          window.location.hash,
          DEFAULT_SUN_PROJECTION,
          DEFAULT_FOOTPRINT_KWP,
          DEFAULT_SHADING_SETTINGS,
        )

        if (!cancelled && shared.ok && shared.value) {
          try {
            dispatch({ type: 'LOAD', payload: shared.value })
          } catch (cause) {
            reportAppError(
              createAppError('SHARE_PAYLOAD_INVALID', 'Shared project state is invalid.', {
                cause,
                context: { area: 'startup-hydration', source: 'hash', enableStateReset: true },
              }),
            )
          }
        } else if (!cancelled && !shared.ok) {
          reportAppError(shared.error)
          recordEvent('startup.hydration.hash_failed', { code: shared.error.code })
        }

        finishHydration()
        return
      }

      const stored = readStorageResult(
        DEFAULT_SUN_PROJECTION,
        DEFAULT_SHADING_SETTINGS,
        DEFAULT_FOOTPRINT_KWP,
        solverConfigVersion,
      )
      if (stored.ok && stored.value && !cancelled) {
        try {
          dispatch({ type: 'LOAD', payload: stored.value })
          recordEvent('startup.hydration.storage_loaded')
        } catch (cause) {
          reportAppError(
            createAppError('STORAGE_CORRUPTED', 'Stored project state is invalid.', {
              cause,
              context: { area: 'startup-hydration', source: 'storage', enableStateReset: true },
            }),
          )
        }
      } else if (!stored.ok && !cancelled) {
        reportAppError(stored.error)
      }

      finishHydration()
    }

    void hydrate().catch((error: unknown) => {
      captureException(error, { area: 'startup-hydration' })
      if (!cancelled) {
        markHydrationFinished()
      }
    })

    return () => {
      cancelled = true
    }
  }, [dispatch, markHydrationFinished, solverConfigVersion])
}
