import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { jd } = await request.json() as { jd: object }
    if (!jd) {
      return Response.json({ error: 'Structured JD is required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [
        { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
      ],
      messages: [{
        role: 'user',
        content: `You are a compensation research analyst. Research the expected salary range for this role by searching the web for current pay data — check sites like levels.fyi, Glassdoor, Payscale, LinkedIn Salary, or public job postings from other companies of a comparable size/industry in the same location. Prefer recent (last 1-2 years) sources.

JOB:
${JSON.stringify(jd, null, 2)}

After researching, respond with ONLY valid JSON on the last line of your reply (no markdown fences), with this exact shape:

{
  "currency": "EUR",
  "period": "year",
  "min": 65000,
  "max": 80000,
  "median": 72000,
  "confidence": "high|medium|low",
  "rationale": "1-2 sentence explanation referencing the role's level, location, and company scale",
  "comparables": ["Company/source: range — one line", "Company/source: range — one line"]
}

Use the currency and pay period conventional for the job's location (e.g. EUR/year for Germany, USD/year for the US). If location or company is unknown/generic, base the estimate on the role title, level, and industry norms, and note the reduced confidence.`,
      }],
    })

    const textBlocks = message.content.filter((b) => b.type === 'text')
    const raw = textBlocks.length ? textBlocks[textBlocks.length - 1].text.trim() : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Could not parse salary estimate from model response' }, { status: 500 })
    }
    const salary = JSON.parse(jsonMatch[0])

    return Response.json(salary)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to estimate salary: ${msg}` }, { status: 500 })
  }
}
