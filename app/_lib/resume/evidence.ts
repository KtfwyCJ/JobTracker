import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { termOccursIn } from './coverage'
import { PROFILE_IDS, type Evidence } from './types'

export class EvidenceError extends Error {
  constructor(public problems: string[]) {
    super(`Invalid evidence:\n- ${problems.join('\n- ')}`)
    this.name = 'EvidenceError'
  }
}

export function parseEvidence(yamlText: string): Evidence {
  const raw = parse(yamlText) as Partial<Evidence> | null
  const ev = {
    ...raw,
    profiles: raw?.profiles ?? [],
    experiences: raw?.experiences ?? [],
    education: raw?.education ?? [],
    research: raw?.research ?? [],
    skillGroups: raw?.skillGroups ?? [],
    languages: raw?.languages ?? [],
    interests: raw?.interests ?? [],
    aliases: raw?.aliases ?? {},
  } as Evidence

  const problems: string[] = []
  const seen = new Set<string>()
  const claim = (id: string) => {
    if (seen.has(id)) problems.push(`duplicate id "${id}"`)
    seen.add(id)
  }

  if (!ev.contact?.name) problems.push('contact.name is required')

  for (const e of ev.experiences) {
    claim(e.id)
    for (const b of e.bullets ?? []) {
      claim(b.id)
      for (const p of b.profiles ?? []) {
        if (!PROFILE_IDS.includes(p)) problems.push(`bullet "${b.id}": unknown profile "${p}"`)
      }
      for (const term of b.bold ?? []) {
        if (!termOccursIn(b.text, term, true)) problems.push(`bullet "${b.id}": bold "${term}" not found in bullet`)
      }
    }
  }
  for (const g of ev.skillGroups) claim(g.id)
  for (const x of ev.education) claim(x.id)
  for (const x of ev.research) claim(x.id)

  const groupIds = new Set(ev.skillGroups.map(g => g.id))
  for (const p of ev.profiles) {
    if (!PROFILE_IDS.includes(p.id)) problems.push(`unknown profile "${p.id}"`)
    for (const g of p.skillGroups ?? []) {
      if (!groupIds.has(g)) problems.push(`profile "${p.id}": unknown skill group "${g}"`)
    }
  }

  if (problems.length) throw new EvidenceError(problems)
  return ev
}

export function loadEvidence(path = 'evidence/cv.yaml'): Evidence {
  return parseEvidence(readFileSync(path, 'utf8'))
}

export function evidenceForPrompt(ev: Evidence): string {
  return JSON.stringify({
    profiles: ev.profiles.map(p => ({ id: p.id, title: p.title, skillGroups: p.skillGroups })),
    experiences: ev.experiences.map(e => ({
      id: e.id,
      company: e.company,
      role: e.role,
      dates: e.dates,
      bullets: e.bullets.map(b => ({ id: b.id, text: b.text, profiles: b.profiles })),
    })),
    skillGroups: ev.skillGroups.map(g => ({ id: g.id, label: g.label, items: g.items })),
  })
}
