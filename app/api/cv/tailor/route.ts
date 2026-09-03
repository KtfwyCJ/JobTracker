import Anthropic from '@anthropic-ai/sdk'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SKILL_PATH = join(process.cwd(), '.claude', 'skills', 'cv-optimizer', 'SKILL.md')

const OUTPUT_FORMAT_ADDENDUM = `---

# Integration output format

You are being invoked programmatically, not interactively — there is no user to show intermediate reasoning to and no follow-up turn to ask clarifying questions in. Skip step 1 (the skill normally reads the JD from a URL); the job description is already provided below as structured JSON plus raw text. Skip any step that asks you to ask the user something — if the JD couldn't be reliably retrieved, do the best job you can with what's given rather than stopping.

Apply the full workflow above (Steps 2–19) to produce the optimized LaTeX CV, then respond with EXACTLY these five sections, in this order, each starting on its own line with the marker shown, and nothing else (no markdown fences, no extra commentary before or after):

===FILENAME===
<the new CV file name per the skill's naming convention: the original CV name with the job title appended, e.g. CV_Alasco_AI_Engineer.tex — filesystem-safe, spaces replaced with underscores>
===SUMMARY===
<a concise summary of the major changes made>
===KEYWORDS===
<comma-separated list of important JD keywords incorporated>
===MISSING===
<comma-separated list of JD requirements that could NOT be added because the candidate's CV provided no evidence for them; write "None" if there are none>
===TEX===
<the complete optimized LaTeX CV, starting with \\documentclass and ending with \\end{document}>`

function loadSystemPrompt(): string {
  const skill = readFileSync(SKILL_PATH, 'utf-8')
  return `${skill}\n\n${OUTPUT_FORMAT_ADDENDUM}`
}

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

    let systemPrompt: string
    try {
      systemPrompt = loadSystemPrompt()
    } catch {
      return Response.json(
        { error: 'cv-optimizer skill not found at .claude/skills/cv-optimizer/SKILL.md.' },
        { status: 500 },
      )
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
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
