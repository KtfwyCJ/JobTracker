import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { TechnicalQuestion } from '../../../_lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchLinkedInText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const html = await res.text()

    if (html.includes('authwall') || (html.includes('sign-in-form') && html.length < 8000)) return null

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text.length > 100 ? text.slice(0, 4000) : null
  } catch {
    return null
  }
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.length > 100 ? text.slice(0, 4000) : null
  } catch {
    return null
  }
}

const VALID_COUNTS = [10, 20, 30, 50] as const
type QuestionCount = typeof VALID_COUNTS[number]

export async function POST(request: Request) {
  try {
    const { linkedinUrl, jobDescription, jobLink, count } = await request.json() as {
      linkedinUrl: string
      jobDescription?: string
      jobLink?: string
      count?: number
    }

    if (!linkedinUrl) {
      return Response.json({ error: 'linkedinUrl is required' }, { status: 400 })
    }

    const questionCount: QuestionCount = VALID_COUNTS.includes(count as QuestionCount)
      ? (count as QuestionCount)
      : 20

    let resolvedDescription = jobDescription?.trim() || ''
    if (!resolvedDescription && jobLink) {
      resolvedDescription = (await fetchPageText(jobLink)) ?? ''
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

    const linkedinText = await fetchLinkedInText(linkedinUrl)
    const linkedinFetched = linkedinText !== null

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: questionCount >= 30 ? 4096 : 2048,
      messages: [
        {
          role: 'user',
          content: `You are a technical interview coach. Given the information below, generate exactly ${questionCount} technical interview questions the candidate should prepare for.

Return ONLY a valid JSON array of exactly ${questionCount} objects — no markdown, no explanation. Each object must have:
- "question": the interview question string
- "likelihood": one of "high", "medium", or "low" — how likely this question is to be asked

Sort the array from most to least likely: all "high" items first, then "medium", then "low".

INTERVIEWER LINKEDIN PROFILE:
${linkedinFetched ? linkedinText : 'Not available'}

JOB DESCRIPTION:
${resolvedDescription ? resolvedDescription.slice(0, 3000) : 'Not available'}

CV:
${cv.slice(0, 6000)}

Focus on:
- Technologies and tools mentioned in the job description
- Areas the interviewer likely specialises in (based on their LinkedIn profile)
- Gaps between the CV and job description requirements
- System design, algorithms, or domain-specific depth appropriate for the role`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(jsonStr)
    const rawQuestions: unknown[] = Array.isArray(parsed) ? parsed : (parsed.questions ?? [])

    const questions: TechnicalQuestion[] = rawQuestions.map((q) => {
      if (typeof q === 'string') return { question: q, likelihood: 'medium' as const }
      const obj = q as Record<string, unknown>
      const likelihood = obj.likelihood === 'high' || obj.likelihood === 'low' ? obj.likelihood : 'medium'
      return { question: String(obj.question ?? ''), likelihood }
    })

    return Response.json({ questions, linkedinFetched })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to generate questions: ${msg}` }, { status: 500 })
  }
}
