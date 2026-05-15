import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { jd, match } = await request.json() as { jd: object; match: object }
    if (!jd || !match) {
      return Response.json({ error: 'JD and match result are required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze the gaps between this job description and the CV match result. Return ONLY valid JSON (no markdown, no explanation):

{
  "hardGaps": ["missing must-have requirement 1"],
  "softGaps": ["missing nice-to-have 1"],
  "score": 7,
  "verdict": "one-line judgment"
}

Score rubric (integer 1-10):
- 9-10: nearly all requirements met, excellent fit
- 7-8: most requirements met, minor gaps
- 5-6: roughly half requirements met
- 3-4: significant skill or experience gaps
- 1-2: major mismatch

Verdict examples: "Strong match — worth applying", "Good match — address gaps in cover letter", "Partial match — significant preparation needed", "Weak match — consider upskilling first"

JOB DESCRIPTION:
${JSON.stringify(jd, null, 2)}

CV MATCH ANALYSIS:
${JSON.stringify(match, null, 2)}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
    const gaps = JSON.parse(jsonStr)

    return Response.json(gaps)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to analyze gaps: ${msg}` }, { status: 500 })
  }
}
