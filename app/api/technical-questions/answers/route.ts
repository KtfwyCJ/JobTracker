import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BATCH_SIZE = 15

async function generateBatch(
  questions: string[],
  cv: string
): Promise<{ question: string; answer: string }[]> {
  const numbered = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a technical interview coach. For each question below, write a concise model answer (2–4 sentences) that the candidate could use as a basis for their response. Tailor answers to the candidate's background where relevant.

Return ONLY a valid JSON array of objects — no markdown, no explanation. Each object must have:
- "question": the exact question string (copy it verbatim from the input)
- "answer": the model answer string

Preserve the same order as the input questions.

CANDIDATE CV:
${cv.slice(0, 6000)}

QUESTIONS:
${numbered}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(jsonStr)
  return Array.isArray(parsed) ? parsed : []
}

export async function POST(request: Request) {
  try {
    const { questions } = await request.json() as { questions: string[] }

    if (!Array.isArray(questions) || questions.length === 0) {
      return Response.json({ error: 'questions array is required' }, { status: 400 })
    }

    let cv: string
    try {
      cv = readFileSync(join(process.cwd(), 'CV.md'), 'utf-8')
    } catch {
      return Response.json(
        { error: 'CV.md not found in project root. Please add your CV as CV.md.' },
        { status: 500 }
      )
    }

    const batches: string[][] = []
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(questions.slice(i, i + BATCH_SIZE))
    }

    const batchResults = await Promise.all(batches.map((batch) => generateBatch(batch, cv)))
    const answers = batchResults.flat()

    return Response.json({ answers })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to generate answers: ${msg}` }, { status: 500 })
  }
}
