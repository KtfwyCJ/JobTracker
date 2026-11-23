import { PROFILE_IDS, type Evidence, type LlmPlan, type Plan, type ProfileId } from './types'
import { findTermSpan, termOccursIn } from './coverage'

type Result = { ok: true; plan: Plan | LlmPlan } | { ok: false; errors: string[] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')

/** Span of the first boundary-respecting, case-sensitive occurrence of term in text. */
function firstSpan(text: string, term: string): [number, number] | null {
  const sp = findTermSpan(text, term, true)
  return sp ? [sp.start, sp.end] : null
}

function check(raw: unknown, ev: Evidence, requireLlm: boolean): Result {
  if (!isObj(raw)) return { ok: false, errors: ['plan must be an object'] }
  const errors: string[] = []
  const allowed = new Set(['profile', 'experiences', 'bold', 'skillGroups'])
  if (requireLlm) { allowed.add('profileReason'); allowed.add('fit') }
  for (const k of Object.keys(raw)) if (!allowed.has(k)) errors.push(`unexpected field "${k}"`)

  // profile
  const profile = raw.profile
  if (typeof profile !== 'string' || !PROFILE_IDS.includes(profile as ProfileId)) {
    errors.push(`unknown profile ${JSON.stringify(profile)}`)
  }

  if (requireLlm) {
    if (typeof raw.profileReason !== 'string') errors.push('profileReason must be a string')
    if (raw.fit !== 'good' && raw.fit !== 'low') errors.push('fit must be "good" or "low"')
  }

  // experiences
  const selected = new Set<string>()
  const experiences: Plan['experiences'] = []
  if (!Array.isArray(raw.experiences)) {
    errors.push('experiences must be an array')
  } else {
    const seenExp = new Set<string>()
    for (const e of raw.experiences) {
      if (!isObj(e) || typeof e.experienceId !== 'string' || !isStrArr(e.bulletIds)) {
        errors.push('malformed experience entry')
        continue
      }
      const exp = ev.experiences.find(x => x.id === e.experienceId)
      if (!exp) { errors.push(`unknown experience "${e.experienceId}"`); continue }
      if (seenExp.has(exp.id)) { errors.push(`duplicate experience "${exp.id}"`); continue }
      seenExp.add(exp.id)
      if (e.bulletIds.length === 0) errors.push(`experience "${exp.id}" has no bullets`)
      const own = new Set(exp.bullets.map(b => b.id))
      for (const id of e.bulletIds) {
        if (!own.has(id)) errors.push(`bullet "${id}" does not belong to "${exp.id}"`)
        else if (selected.has(id)) errors.push(`duplicate bullet "${id}"`)
        selected.add(id)
      }
      experiences.push({ experienceId: exp.id, bulletIds: [...e.bulletIds] })
    }
    for (const exp of ev.experiences) if (!seenExp.has(exp.id)) errors.push(`missing experience "${exp.id}"`)
  }

  // bold
  const bold: Plan['bold'] = []
  if (!Array.isArray(raw.bold)) {
    errors.push('bold must be an array')
  } else {
    const seenBold = new Set<string>()
    const bulletText = new Map(ev.experiences.flatMap(x => x.bullets).map(b => [b.id, b.text]))
    for (const b of raw.bold) {
      if (!isObj(b) || typeof b.bulletId !== 'string' || !isStrArr(b.terms)) {
        errors.push('malformed bold entry')
        continue
      }
      if (seenBold.has(b.bulletId)) errors.push(`duplicate bold entry for "${b.bulletId}"`)
      seenBold.add(b.bulletId)
      const text = bulletText.get(b.bulletId)
      if (text === undefined) { errors.push(`bold references unknown bullet "${b.bulletId}"`); continue }
      if (!selected.has(b.bulletId)) { errors.push(`bold references unselected bullet "${b.bulletId}"`); continue }
      const spans: [string, [number, number]][] = []
      for (const t of b.terms) {
        if (!termOccursIn(text, t, true)) { errors.push(`bold term "${t}" not found in bullet "${b.bulletId}"`); continue }
        const span = firstSpan(text, t)
        if (span) spans.push([t, span])
      }
      for (let i = 0; i < spans.length; i++) {
        for (let j = i + 1; j < spans.length; j++) {
          const [a, b2] = [spans[i][1], spans[j][1]]
          if (a[0] < b2[1] && b2[0] < a[1]) {
            errors.push(`bold terms "${spans[i][0]}" and "${spans[j][0]}" overlap in bullet "${b.bulletId}"`)
          }
        }
      }
      bold.push({ bulletId: b.bulletId, terms: [...b.terms] })
    }
  }

  // skills
  const skillGroups: Plan['skillGroups'] = []
  if (!Array.isArray(raw.skillGroups)) {
    errors.push('skillGroups must be an array')
  } else {
    const seenG = new Set<string>()
    for (const g of raw.skillGroups) {
      if (!isObj(g) || typeof g.groupId !== 'string' || !isStrArr(g.items)) {
        errors.push('malformed skill group entry')
        continue
      }
      const grp = ev.skillGroups.find(x => x.id === g.groupId)
      if (!grp) { errors.push(`unknown skill group "${g.groupId}"`); continue }
      if (seenG.has(grp.id)) { errors.push(`duplicate skill group "${grp.id}"`); continue }
      seenG.add(grp.id)
      const want = [...grp.items].sort()
      const got = [...g.items].sort()
      if (want.length !== got.length || want.some((x, i) => x !== got[i])) {
        errors.push(`skill group "${grp.id}" items must be a reordering of the original items`)
      }
      skillGroups.push({ groupId: grp.id, items: [...g.items] })
    }
    for (const grp of ev.skillGroups) if (!seenG.has(grp.id)) errors.push(`missing skill group "${grp.id}"`)
  }

  if (errors.length) return { ok: false, errors }
  const plan: Plan = { profile: profile as ProfileId, experiences, bold, skillGroups }
  if (requireLlm) {
    return { ok: true, plan: { ...plan, profileReason: raw.profileReason as string, fit: raw.fit as 'good' | 'low' } }
  }
  return { ok: true, plan }
}

export function validatePlan(raw: unknown, ev: Evidence, opts?: { requireLlmFields?: boolean }): Result {
  try {
    return check(raw, ev, !!opts?.requireLlmFields)
  } catch (e) {
    return { ok: false, errors: [`validator error: ${e instanceof Error ? e.message : String(e)}`] }
  }
}
