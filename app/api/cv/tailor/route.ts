import Anthropic from '@anthropic-ai/sdk'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are the CV Optimizer: you tailor a candidate's generic LaTeX CV to a specific job description.

Core principle: optimize for JD relevance + factual accuracy + natural writing + ATS compatibility. Never optimize for keyword density alone.

Rules:
- Preserve the candidate's factual experience. Never invent experience, technologies, metrics, responsibilities, or achievements not present in the source CV.
- Reposition truthfully: reframe the candidate's existing experience toward the target role's terminology without changing their actual seniority or claiming an official title they never held.
- Match the JD's exact terminology and phrases where the candidate's real experience genuinely supports them (e.g. prefer "cross-functional collaboration" over "cross-team coordination" if the JD uses that phrase and it fits).
- Reorder the Skills section and experience bullets by relevance to this JD; do not delete factual content, just re-prioritize and rephrase.
- Do not invent metrics. If no metric exists, describe concrete scope instead.
- Preserve the LaTeX document's structure, commands, macros, fonts, spacing, and visual style exactly. Only change textual content (and ordering of items within existing structures). The output must be valid, compilable LaTeX with no unescaped special characters or broken commands.
- Do not add extra "-" bullet symbols beyond what the template already uses.
- Keep it sounding like a human engineer wrote it — no keyword stuffing, no generic AI language.

Output format — respond with EXACTLY these five sections, in this order, each starting on its own line with the marker shown (no markdown fences, no extra commentary):

===FILENAME===
<a filesystem-safe .tex filename in the form CV_<Company>_<JobTitle>.tex, spaces replaced with underscores, no special characters>
===SUMMARY===
<2-4 sentences summarizing the major changes made>
===KEYWORDS===
<comma-separated list of important JD keywords incorporated>
===MISSING===
<comma-separated list of JD requirements that could NOT be added because the CV had no supporting evidence; write "None" if there are none>
===TEX===
<the complete tailored LaTeX document, starting with \\documentclass and ending with \\end{document}>`

interface TailorRequestBody {
  jd?: {
    title?: string
    company?: string
    level?: string
    location?: string
    skills?: string[]
    requirements?: string[]
    niceToHave?: string[]
  }
  jobText?: string
}

function parseSection(raw: string, marker: string, nextMarkers: string[]): string {
  const start = raw.indexOf(marker)
  if (start === -1) return ''
  const from = start + marker.length
  let end = raw.length
  for (const next of nextMarkers) {
    const idx = raw.indexOf(next, from)
    if (idx !== -1 && idx < end) end = idx
  }
  return raw.slice(from, end).trim()
}

function slugify(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Role'
}

export async function POST(request: Request) {
  try {
    const { jd, jobText } = await request.json() as TailorRequestBody
    if (!jd) {
      return Response.json({ error: 'Structured JD is required' }, { status: 400 })
    }

    let cvTex: string
    try {
      cvTex = readFileSync(join(process.cwd(), 'CV.tex'), 'utf-8')
    } catch {
      return Response.json(
        { error: 'CV.tex not found in project root. Please add your generic LaTeX CV as CV.tex.' },
        { status: 500 },
      )
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `JOB DESCRIPTION (structured):
${JSON.stringify(jd, null, 2)}

JOB DESCRIPTION (raw text, for additional context):
${(jobText ?? '').slice(0, 6000)}

CANDIDATE'S GENERIC LATEX CV:
${cvTex}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    const markers = ['===FILENAME===', '===SUMMARY===', '===KEYWORDS===', '===MISSING===', '===TEX===']
    const filenameRaw = parseSection(raw, markers[0], markers.slice(1))
    const summary = parseSection(raw, markers[1], markers.slice(2))
    const keywordsRaw = parseSection(raw, markers[2], markers.slice(3))
    const missingRaw = parseSection(raw, markers[3], markers.slice(4))
    const tex = parseSection(raw, markers[4], [])

    if (!tex) {
      return Response.json({ error: 'CV optimizer did not return a tailored CV. Please try again.' }, { status: 500 })
    }

    const filename = /\.tex$/i.test(filenameRaw)
      ? filenameRaw.trim()
      : `CV_${slugify(jd.company ?? 'Company')}_${slugify(jd.title ?? 'Role')}.tex`

    const keywordsAdded = keywordsRaw ? keywordsRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
    const missingRequirements = missingRaw && !/^none$/i.test(missingRaw.trim())
      ? missingRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    const outDir = join(process.cwd(), 'generated-cvs')
    try {
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
      writeFileSync(join(outDir, filename), tex, 'utf-8')
    } catch {
      // Non-fatal: still return the tailored CV even if it couldn't be persisted to disk.
    }

    return Response.json({ tex, filename, summary, keywordsAdded, missingRequirements })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to tailor CV: ${msg}` }, { status: 500 })
  }
}
