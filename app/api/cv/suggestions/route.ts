import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { jd, gaps } = await request.json() as {
      jd: object
      gaps: { hardGaps?: string[]; softGaps?: string[] }
    }

    if (!jd || !gaps) {
      return Response.json({ error: 'JD and gaps result are required' }, { status: 400 })
    }

    let cv: string
    try {
      cv = readFileSync(join(process.cwd(), 'CV.md'), 'utf-8')
    } catch {
      return Response.json(
        { error: 'CV.md not found in project root. Please add your CV as CV.md.' },
        { status: 500 },
      )
    }

    const allGaps = [...(gaps.hardGaps ?? []), ...(gaps.softGaps ?? [])]
    if (allGaps.length === 0) {
      return Response.json({ suggestions: [] })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are helping a candidate improve their CV to better match a job description. For each gap listed below, write one ready-to-paste CV bullet that addresses the gap. The bullet MUST be grounded in the candidate's existing experience — do not invent skills or roles they don't have. Instead, reframe or highlight existing experience to make the gap less apparent, or suggest a concrete addition they could genuinely make (e.g. a project, a certification mention).

Return ONLY valid JSON (no markdown, no explanation):

{
  "suggestions": [
    { "gap": "exact gap text", "bullet": "ready-to-paste CV bullet" }
  ]
}

One object per gap, in the same order as the gaps list.

GAPS TO ADDRESS:
${allGaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

JOB DESCRIPTION:
${JSON.stringify(jd, null, 2)}

CANDIDATE CV:
${cv.slice(0, 6000)}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
    const result = JSON.parse(jsonStr)

    return Response.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to generate CV suggestions: ${msg}` }, { status: 500 })
  }
}
