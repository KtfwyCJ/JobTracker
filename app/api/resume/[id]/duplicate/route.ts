import { duplicateVersion } from '../../../../_lib/resume/pipeline'
import { errorResponse, type RouteCtx } from '../../_errors'

export const runtime = 'nodejs'

/** Copy a version into a new draft over the current evidence; the LLM only re-runs if the old plan no longer validates. */
export async function POST(_req: Request, { params }: RouteCtx) {
  try {
    const { id } = await params
    const r = await duplicateVersion(id)
    if (!r.ok) return Response.json({ errors: r.errors }, { status: 422 })
    return Response.json({ id: r.id, regenerated: r.regenerated })
  } catch (e) {
    return errorResponse(e)
  }
}
