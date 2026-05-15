import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { jd } = await request.json() as { jd: object }
    if (!jd) {
      return Response.json({ error: 'Structured JD is required' }, { status: 400 })
    }

    let cv: string
    try {
      cv = readFileSync(join(process.cwd(), 'CV.md'), 'utf-8')
    } catch {
      return Response.json({ error: 'CV.md not found in project root. Please add your CV as CV.md.' }, { status: 500 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Compare this job description against the CV and return ONLY valid JSON (no markdown, no explanation):

{
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "summary": "2-3 sentence narrative"
}

- strengths: specific skills/experiences in the CV that match the JD requirements
- gaps: requirements in the JD not clearly evidenced in the CV
- summary: a concise narrative about the overall match

JOB DESCRIPTION:
${JSON.stringify(jd, null, 2)}

CV:
${cv.slice(0, 6000)}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
    const match = JSON.parse(jsonStr)

    return Response.json(match)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to match CV: ${msg}` }, { status: 500 })
  }
}
