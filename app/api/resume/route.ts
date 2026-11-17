import { normalizeJd } from '../../_lib/resume/llm'
import { generateVersion } from '../../_lib/resume/pipeline'
import { badRequest, errorResponse, readJson } from './_errors'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const b = await readJson(req)
  const jd = b ? normalizeJd(b.jd) : null
  if (!b || !jd) return badRequest('jd must be an object')
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  try {
    const r = await generateVersion({
      jd,
      jobUrl: str(b.jobUrl), jobText: str(b.jobText), analysis: str(b.analysis),
      gapsScore: typeof b.gapsScore === 'number' ? b.gapsScore : undefined,
    })
    if (!r.ok) return Response.json({ errors: r.errors }, { status: 422 })
    return Response.json({ id: r.id })
  } catch (e) {
    return errorResponse(e)
  }
}
