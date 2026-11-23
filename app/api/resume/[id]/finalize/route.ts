import { finalizeVersion, readVersionView } from '../../../../_lib/resume/versions'
import { errorResponse, type RouteCtx } from '../../_errors'

export const runtime = 'nodejs'

export async function POST(_req: Request, { params }: RouteCtx) {
  try {
    const { id } = await params
    await finalizeVersion(id)
    return Response.json(readVersionView(id))
  } catch (e) {
    return errorResponse(e)
  }
}
