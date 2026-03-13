import { useCallback } from 'react'
import { buildSharePayload, serializeSharePayload } from '../../state/project-store/projectState.share'
import type { ProjectState } from '../../state/project-store/projectState.types'
import { encodeSharePayload } from '../../shared/utils/shareCodec'
import { reportAppErrorCode, reportAppSuccess } from '../../shared/errors'

const MAX_SHARE_URL_LENGTH = 3500

interface UseShareProjectArgs {
  footprints: ProjectState['footprints']
  activeFootprintId: ProjectState['activeFootprintId']
  obstacles: ProjectState['obstacles']
  activeObstacleId: ProjectState['activeObstacleId']
  sunProjection: ProjectState['sunProjection']
}

interface UseShareProjectResult {
  onShareProject: () => Promise<void>
  resetShareStatus: () => void
}

export function useShareProject({
  footprints,
  activeFootprintId,
  obstacles,
  activeObstacleId,
  sunProjection,
}: UseShareProjectArgs): UseShareProjectResult {
  const resetShareStatus = useCallback(() => {
    // no-op kept for API compatibility
  }, [])

  const onShareProject = useCallback(async () => {
    if (Object.keys(footprints).length === 0) {
      reportAppErrorCode('SHARE_OPERATION_FAILED', 'Nothing to share yet. Add at least one footprint.', {
        context: { area: 'share-project', reason: 'empty-project' },
      })
      return
    }

    try {
      const payload = buildSharePayload({
        footprints,
        activeFootprintId,
        obstacles,
        activeObstacleId,
        sunProjection,
      })
      const encoded = await encodeSharePayload(serializeSharePayload(payload))
      const shareUrl = new URL(window.location.href)
      shareUrl.hash = `c=${encoded}`
      const shareUrlValue = shareUrl.toString()

      if (shareUrlValue.length > MAX_SHARE_URL_LENGTH) {
        reportAppErrorCode('SHARE_OPERATION_FAILED', 'Project is too large to share as a URL.', {
          context: { area: 'share-project', reason: 'url-too-long' },
        })
        return
      }

      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'SunCast project', url: shareUrlValue })
          reportAppSuccess('Share dialog opened.', { area: 'share-project' })
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }
        }
      }

      if (!navigator.clipboard?.writeText) {
        reportAppErrorCode('SHARE_OPERATION_FAILED', 'Clipboard sharing is not available in this browser.', {
          context: { area: 'share-project', reason: 'clipboard-unavailable' },
        })
        return
      }

      await navigator.clipboard.writeText(shareUrlValue)
      reportAppSuccess('Share URL copied to clipboard.', { area: 'share-project' })
    } catch (cause) {
      reportAppErrorCode('SHARE_OPERATION_FAILED', 'Could not generate share URL.', {
        cause,
        context: { area: 'share-project', reason: 'encode-failed' },
      })
    }
  }, [activeFootprintId, activeObstacleId, footprints, obstacles, sunProjection])

  return {
    onShareProject,
    resetShareStatus,
  }
}
