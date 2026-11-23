import Anthropic from '@anthropic-ai/sdk'
import { evidenceForPrompt } from './evidence'
import { validatePlan } from './validate'
import { PROFILE_IDS, type Evidence, type JdAnalysis, type JdRequirement, type LlmPlan, type ProfileId } from './types'

export const MAX_BULLETS = 11
const MODEL = 'claude-opus-5-5'

export class LlmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmError'
  }
}

export type CallModel = (args: {
  system: string
  user: string
  schema: object
  effort: 'low' | 'medium'
}) => Promise<unknown>

export const anthropicCall: CallModel = async ({ system, user, schema, effort }) => {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { effort, format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
  })
  if (response.stop_reason === 'refusal') throw new LlmError('Model refused to answer')
  if (response.stop_reason === 'max_tokens') throw new LlmError('Model output was truncated (max_tokens)')
  const block = response.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new LlmError('Model returned no text block')
  try {
    return JSON.parse(block.text)
  } catch {
    throw new LlmError('Model returned invalid JSON')
  }
}

const strArray = { type: 'array', items: { type: 'string' } }
const requirement = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'keywords'],
  properties: { text: { type: 'string' }, keywords: strArray },
}

export const JD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'company', 'level', 'location', 'skills', 'requirements', 'niceToHave', 'mustHave', 'plus', 'keywords'],
  properties: {
    title: { type: 'string' },
    company: { type: 'string' },
    level: { type: 'string' },
    location: { type: 'string' },
    skills: strArray,
    requirements: strArray,
    niceToHave: strArray,
    mustHave: { type: 'array', items: requirement },
    plus: { type: 'array', items: requirement },
    keywords: strArray,
  },
}

const JD_SYSTEM = `You extract structured information from a job description.
- title, company, level (Junior|Mid|Senior|Staff|Principal|Lead|Manager|Director|VP|C-level), location (or Remote); use "" when unknown.
- skills, requirements, niceToHave: short lists of strings.
- mustHave: each hard requirement with its "text" and the concrete technology/skill "keywords" it names.
- plus: the same for nice-to-have items.
- keywords: all distinct technologies and skills mentioned.
Return only data from the job description; never invent anything.`

const optStr = (v: unknown) => (typeof v === 'string' ? v : undefined)
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const optStrList = (v: unknown) => (Array.isArray(v) ? strList(v) : undefined)
const reqList = (v: unknown): JdRequirement[] =>
  Array.isArray(v)
    ? v.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && typeof r.text === 'string')
      .map(r => ({ text: r.text as string, keywords: strList(r.keywords) }))
    : []

/**
 * Coerce untrusted JD data (model output or a request body) into a JdAnalysis that downstream code can rely on:
 * mustHave/plus/keywords always arrays, scalar fields strings or undefined. Returns null if `raw` is not an object.
 */
export function normalizeJd(raw: unknown): JdAnalysis | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  return {
    title: optStr(o.title), company: optStr(o.company), level: optStr(o.level), location: optStr(o.location),
    skills: optStrList(o.skills), requirements: optStrList(o.requirements), niceToHave: optStrList(o.niceToHave),
    mustHave: reqList(o.mustHave), plus: reqList(o.plus), keywords: strList(o.keywords),
  }
}

export async function structureJd(text: string, call: CallModel = anthropicCall): Promise<JdAnalysis> {
  const out = await call({
    system: JD_SYSTEM,
    user: `Job Description:\n${text}`,
    schema: JD_SCHEMA,
    effort: 'low',
  })
  const jd = normalizeJd(out)
  if (!jd) throw new LlmError('Model returned a non-object JD')
  return jd
}

export function buildPlanSchema(ev: Evidence, profile?: ProfileId): object {
  const experienceIds = ev.experiences.map(e => e.id)
  const bulletIds = ev.experiences.flatMap(e => e.bullets.map(b => b.id))
  const groupIds = ev.skillGroups.map(g => g.id)
  return {
    type: 'object',
    additionalProperties: false,
    required: ['profile', 'profileReason', 'fit', 'experiences', 'bold', 'skillGroups'],
    properties: {
      profile: { type: 'string', enum: profile ? [profile] : [...PROFILE_IDS] },
      profileReason: { type: 'string' },
      fit: { type: 'string', enum: ['good', 'low'] },
      experiences: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['experienceId', 'bulletIds'],
          properties: {
            experienceId: { type: 'string', enum: experienceIds },
            bulletIds: { type: 'array', items: { type: 'string', enum: bulletIds } },
          },
        },
      },
      bold: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['bulletId', 'terms'],
          properties: {
            bulletId: { type: 'string', enum: bulletIds },
            terms: strArray,
          },
        },
      },
      skillGroups: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['groupId', 'items'],
          properties: {
            groupId: { type: 'string', enum: groupIds },
            items: strArray,
          },
        },
      },
    },
  }
}

export const PLAN_SYSTEM = `You tailor a resume to a job description by selecting and ordering EXISTING evidence. You never write new resume text.
Rules:
- Never invent text. Bullets are referenced by id only and are never reworded.
- Choose exactly one profile.
- Keep every experience, each with at least 1 bullet.
- Total bullets across all experiences must be <= maxBullets.
- Order bullets within an experience by relevance to the job description.
- Bold terms must be exact substrings of that bullet's text.
- bold is the FULL list for each selected bullet, not a delta. Each bullet's default bold terms are shown in the evidence; repeat them to keep them, omit one only to remove it.
- Skills are only reordered: list skill groups in order of relevance and the items within each group in order of relevance; never add or drop items.
- Set fit to "low" when no profile fits the job well, and say why in profileReason.`

export async function planResume(
  args: { jd: JdAnalysis; ev: Evidence; profile?: ProfileId; maxBullets: number },
  call: CallModel = anthropicCall,
): Promise<{ ok: true; plan: LlmPlan } | { ok: false; errors: string[] }> {
  const { jd, ev, profile, maxBullets } = args
  const schema = buildPlanSchema(ev, profile)
  const baseUser =
    `Structured job description:\n${JSON.stringify(jd)}\n\n` +
    `Evidence:\n${evidenceForPrompt(ev)}\n\n` +
    `maxBullets: ${maxBullets}` +
    (profile ? `\nRequired profile: ${profile}` : '')

  let user = baseUser
  let errors: string[] = []
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: unknown
    let callError: string | undefined
    try {
      raw = await call({ system: PLAN_SYSTEM, user, schema, effort: 'medium' })
    } catch (e) {
      callError = e instanceof Error ? e.message : String(e)
    }
    if (callError === undefined) {
      const v = validatePlan(raw, ev, { requireLlmFields: true })
      if (v.ok) return { ok: true, plan: v.plan as LlmPlan }
      errors = v.errors
    } else {
      errors = [callError]
    }
    const previous = callError === undefined ? JSON.stringify(raw) : callError
    user =
      `${baseUser}\n\nYour previous answer was rejected:\n${previous}\n\nErrors:\n` +
      errors.map(e => `- ${e}`).join('\n')
  }
  return { ok: false, errors }
}
