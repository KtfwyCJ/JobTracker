import type { JdAnalysis } from '../../_lib/resume/types'
import { generateVersion } from '../../_lib/resume/pipeline'
import { badRequest, errorResponse, readJson } from './_errors'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const b = await readJson(req)
  if (!b || typeof b.jd !== 'object' || b.jd === null) return badRequest('jd is required')
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  try {
    const r = await generateVersion({
      jd: b.jd as JdAnalysis,
      jobUrl: str(b.jobUrl), jobText: str(b.jobText), analysis: str(b.analysis),
      gapsScore: typeof b.gapsScore === 'number' ? b.gapsScore : undefined,
    })
    if (!r.ok) return Response.json({ errors: r.errors }, { status: 422 })
    return Response.json({ id: r.id })
  } catch (e) {
    return errorResponse(e)
  }
}
