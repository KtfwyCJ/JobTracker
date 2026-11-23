import { PROFILE_IDS, type ProfileId } from '../../../_lib/resume/types'
import { regenerateForProfile } from '../../../_lib/resume/pipeline'
import { readVersionView, updateVersion } from '../../../_lib/resume/versions'
import { badRequest, errorResponse, readJson, type RouteCtx } from '../_errors'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: RouteCtx) {
  try {
    const { id } = await params
    return Response.json(readVersionView(id))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const { id } = await params
    const b = await readJson(req)
    if (!b) return badRequest('Body must be a JSON object')
    const keys = Object.keys(b)
    const only = (allowed: string[]) => keys.length > 0 && keys.every((k) => allowed.includes(k))

    if (only(['accepted'])) {
      if (!Array.isArray(b.accepted) || !b.accepted.every((x) => typeof x === 'string')) return badRequest('accepted must be string[]')
      await updateVersion(id, { accepted: b.accepted as string[] })
    } else if (only(['analysis', 'gapsScore'])) {
      if (b.analysis !== undefined && typeof b.analysis !== 'string') return badRequest('analysis must be a string')
      if (b.gapsScore !== undefined && (typeof b.gapsScore !== 'number' || !Number.isFinite(b.gapsScore))) return badRequest('gapsScore must be a number')
      await updateVersion(id, { analysis: b.analysis as string | undefined, gapsScore: b.gapsScore as number | undefined })
    } else if (only(['manualTex'])) {
      if (b.manualTex !== null && typeof b.manualTex !== 'string') return badRequest('manualTex must be a string or null')
      await updateVersion(id, { manualTex: b.manualTex as string | null })
    } else if (only(['regenerateProfile'])) {
      if (!PROFILE_IDS.includes(b.regenerateProfile as ProfileId)) return badRequest('Unknown profile')
      const r = await regenerateForProfile(id, b.regenerateProfile as ProfileId)
      if (!r.ok) return Response.json({ errors: r.errors }, { status: 422 })
    } else {
      return badRequest('Body must be exactly one of { accepted }, { analysis?, gapsScore? }, { regenerateProfile }, { manualTex }')
    }
    return Response.json(readVersionView(id))
  } catch (e) {
    return errorResponse(e)
  }
}
