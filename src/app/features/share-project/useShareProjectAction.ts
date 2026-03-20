import { useCallback } from 'react'
import { buildSharePayload, serializeSharePayload } from '../../../state/project-store/projectState.share'
import { encodeSharePayload } from '../../../shared/utils/shareCodec'
import { reportAppErrorCode, reportAppSuccess } from '../../../shared/errors'
import type { ReturnTypeUseProjectDocument } from '../../hooks/hookReturnTypes'

const MAX_SHARE_URL_LENGTH = 3500

interface UseShareProjectActionResult {
  onShareProject: () => Promise<void>
}

export function useShareProjectAction(projectDocument: ReturnTypeUseProjectDocument): UseShareProjectActionResult {
  const onShareProject = useCallback(async () => {
    const store = projectDocument

    if (Object.keys(store.state.footprints).length === 0) {
      reportAppErrorCode('SHARE_OPERATION_FAILED', 'Nothing to share yet. Add at least one footprint.', {
        context: { area: 'share-project', reason: 'empty-project' },
      })
      return
    }

    try {
      const payload = buildSharePayload({
        footprints: store.state.footprints,
        obstacles: store.state.obstacles,
        sunProjection: store.state.sunProjection,
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
  }, [projectDocument])

  return {
    onShareProject,
  }
}
