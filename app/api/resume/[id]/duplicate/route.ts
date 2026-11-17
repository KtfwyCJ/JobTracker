import { generateVersion } from '../../../../_lib/resume/pipeline'
import { readVersionView } from '../../../../_lib/resume/versions'
import { errorResponse, type RouteCtx } from '../../_errors'

export const runtime = 'nodejs'

export async function POST(_req: Request, { params }: RouteCtx) {
  try {
    const { id } = await params
    const v = readVersionView(id)
    const r = await generateVersion({ jd: v.jd, jobUrl: v.jobUrl, jobText: v.jobText, analysis: v.analysis, gapsScore: v.gapsScore })
    if (!r.ok) return Response.json({ errors: r.errors }, { status: 422 })
    return Response.json({ id: r.id })
  } catch (e) {
    return errorResponse(e)
  }
}
