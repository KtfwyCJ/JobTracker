import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { text } = await request.json() as { text: string }
    if (!text?.trim()) {
      return Response.json({ error: 'JD text is required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Extract the key information from this job description and return ONLY valid JSON with this exact shape (no markdown, no explanation):

{
  "title": "job title",
  "company": "company name",
  "level": "Junior|Mid|Senior|Staff|Principal|Lead|Manager|Director|VP|C-level",
  "location": "location or Remote",
  "skills": ["skill1", "skill2"],
  "requirements": ["requirement1", "requirement2"],
  "niceToHave": ["nice1", "nice2"]
}

Job Description:
${text.slice(0, 8000)}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
    const structured = JSON.parse(jsonStr)

    return Response.json(structured)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to structure JD: ${msg}` }, { status: 500 })
  }
}
