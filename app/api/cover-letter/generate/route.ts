import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { jd, match, gaps } = await request.json() as {
      jd: { title?: string; company?: string; level?: string }
      match: { strengths?: string[]; summary?: string }
      gaps: { hardGaps?: string[]; score?: number; verdict?: string }
    }

    if (!jd || !match || !gaps) {
      return Response.json({ error: 'JD, match, and gaps results are required' }, { status: 400 })
    }

    let template: string
    try {
      template = readFileSync(join(process.cwd(), 'CoverLetterTemplate.md'), 'utf-8')
    } catch {
      return Response.json(
        { error: 'CoverLetterTemplate.md not found in project root. Please add your cover letter template.' },
        { status: 500 }
      )
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You have a cover letter template written by the candidate. Adapt it for the specific job below. Return ONLY the cover letter text — no subject line, no JSON, no markdown.

TEMPLATE:
${template}

Instructions:
- Replace "XXXX" with the actual job title and mention the company by name in the opening
- Tailor the body to highlight the top 2-3 matching strengths with concrete examples drawn from the match analysis
- If there are hard gaps, briefly acknowledge them positively (e.g. "I am actively expanding my experience in X")
- Keep the candidate's personal voice, tone, and letter structure from the template
- Close with genuine enthusiasm and a clear call to action
- Target 300–400 words

JOB: ${jd.title ?? 'the role'} at ${jd.company ?? 'the company'} (${jd.level ?? ''})

MATCH STRENGTHS:
${(match.strengths ?? []).join('\n')}

MATCH SUMMARY:
${match.summary ?? ''}

HARD GAPS TO ADDRESS:
${(gaps.hardGaps ?? []).join('\n') || 'None'}`,
      }],
    })

    const coverLetter = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    return Response.json({ coverLetter })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to generate cover letter: ${msg}` }, { status: 500 })
  }
}
