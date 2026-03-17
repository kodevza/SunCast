import type { ProjectSunProjectionSettings, ShadingSettings } from '../../types/geometry'
import { err, ok, type AppError, type Result } from '../../shared/errors'
import { decodeSharePayloadResult } from '../../shared/utils/shareCodec'
import { deserializeSharePayloadResult } from '../../state/project-store/projectState.share'
import type { ProjectState } from '../../state/project-store/projectState.types'

function getShareParamFromHash(hash: string): string | null {
  const hashPayload = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(hashPayload).get('c')
}

export function clearShareHashPayloadFromLocation(location: Location): void {
  const normalizedHash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
  if (!normalizedHash) {
    return
  }

  const params = new URLSearchParams(normalizedHash)
  if (!params.has('c')) {
    return
  }

  params.delete('c')
  const nextHash = params.toString()
  const nextUrl = `${location.pathname}${location.search}${nextHash ? `#${nextHash}` : ''}`
  window.history.replaceState(window.history.state, '', nextUrl)
}

export async function readSharedStateFromHashResult(
  hash: string,
  defaultSunProjection: ProjectSunProjectionSettings,
  defaultFootprintKwp: number,
  defaultShadingSettings: ShadingSettings,
): Promise<Result<ProjectState | null, AppError>> {
  const shareParam = getShareParamFromHash(hash)
  if (!shareParam) {
    return ok(null)
  }

  const decoded = await decodeSharePayloadResult(shareParam)
  if (!decoded.ok) {
    return err(decoded.error)
  }

  return deserializeSharePayloadResult(
    decoded.value,
    defaultSunProjection,
    defaultFootprintKwp,
    defaultShadingSettings,
  )
}
