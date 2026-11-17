import type { Evidence, Plan } from './types'

export type SuggestionKind =
  | 'bullet-add' | 'bullet-remove' | 'order' | 'bold-add' | 'bold-remove' | 'skills-order' | 'skills-groups'

export type Suggestion = {
  id: string
  kind: SuggestionKind
  experienceId?: string
  bulletId?: string
  term?: string
  groupId?: string
  label: string
}

export type DiffRow = {
  bulletId: string
  text: string
  status: 'kept' | 'added' | 'removed' | 'moved'
  boldAdded: string[]
  boldRemoved: string[]
}
export type DiffSection = { experienceId: string; company: string; rows: DiffRow[] }
export type SkillsDiff = { groupId: string; label: string; before: string[]; after: string[] }

const bulletIndex = (ev: Evidence) => {
  const m = new Map<string, { expId: string; pos: number; text: string; bold: string[] }>()
  for (const e of ev.experiences)
    e.bullets.forEach((b, pos) => m.set(b.id, { expId: e.id, pos, text: b.text, bold: b.bold }))
  return m
}

const sel = (p: Plan, expId: string) => p.experiences.find((e) => e.experienceId === expId)?.bulletIds ?? []
const boldOf = (p: Plan, id: string) => p.bold.find((b) => b.bulletId === id)?.terms ?? []
const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

function baseline(ev: Evidence, base: Plan, bulletId: string): string[] {
  const info = bulletIndex(ev).get(bulletId)
  const inBase = base.experiences.some((e) => e.bulletIds.includes(bulletId))
  return inBase ? boldOf(base, bulletId) : (info?.bold ?? [])
}

/** Relative order of bullets present in both lists differs. */
function orderDiffers(a: string[], b: string[]): boolean {
  const common = (x: string[], y: string[]) => x.filter((id) => y.includes(id))
  return !sameArr(common(a, b), common(b, a))
}

export function normalizePlan(plan: Plan, ev: Evidence): Plan {
  const idx = bulletIndex(ev)
  const experiences = ev.experiences
    .map((e) => plan.experiences.find((x) => x.experienceId === e.id))
    .filter((x): x is Plan['experiences'][number] => !!x)
    .map((x) => ({ experienceId: x.experienceId, bulletIds: [...x.bulletIds] }))
  const selected = new Set(experiences.flatMap((e) => e.bulletIds))
  const bold = plan.bold
    .filter((b) => selected.has(b.bulletId) && b.terms.length > 0)
    .map((b) => ({ bulletId: b.bulletId, terms: [...b.terms].sort() }))
  // evidence order: experience, then bullet position
  const expOrder = new Map(ev.experiences.map((e, i) => [e.id, i]))
  bold.sort((a, b) => {
    const ia = idx.get(a.bulletId), ib = idx.get(b.bulletId)
    return (expOrder.get(ia?.expId ?? '') ?? 0) - (expOrder.get(ib?.expId ?? '') ?? 0) || (ia?.pos ?? 0) - (ib?.pos ?? 0)
  })
  return {
    profile: plan.profile,
    experiences,
    bold,
    skillGroups: plan.skillGroups.map((g) => ({ groupId: g.groupId, items: [...g.items] })),
  }
}

export function diffPlans(ev: Evidence, base: Plan, target: Plan): Suggestion[] {
  const out: Suggestion[] = []
  const idx = bulletIndex(ev)
  for (const exp of ev.experiences) {
    const b = sel(base, exp.id), t = sel(target, exp.id)
    for (const id of t.filter((x) => !b.includes(x)))
      out.push({ id: `bullet+:${id}`, kind: 'bullet-add', experienceId: exp.id, bulletId: id, label: `Add: ${idx.get(id)?.text ?? id}` })
    for (const id of b.filter((x) => !t.includes(x)))
      out.push({ id: `bullet-:${id}`, kind: 'bullet-remove', experienceId: exp.id, bulletId: id, label: `Remove: ${idx.get(id)?.text ?? id}` })
    // order is needed when the common bullets are reordered, or when the added bullets
    // would not land where target puts them (appended at the end by default)
    const defaultOrder = [...b.filter((x) => t.includes(x)), ...t.filter((x) => !b.includes(x))]
    if (!sameArr(defaultOrder, t))
      out.push({ id: `order:${exp.id}`, kind: 'order', experienceId: exp.id, label: `Reorder bullets at ${exp.company}` })
    for (const id of t) {
      const from = baseline(ev, base, id), to = boldOf(target, id)
      for (const term of [...to].sort().filter((x) => !from.includes(x)))
        out.push({ id: `bold+:${id}:${term}`, kind: 'bold-add', experienceId: exp.id, bulletId: id, term, label: `Bold "${term}"` })
      for (const term of [...from].sort().filter((x) => !to.includes(x)))
        out.push({ id: `bold-:${id}:${term}`, kind: 'bold-remove', experienceId: exp.id, bulletId: id, term, label: `Unbold "${term}"` })
    }
  }
  const baseIds = base.skillGroups.map((g) => g.groupId)
  const tgtIds = target.skillGroups.map((g) => g.groupId)
  if (orderDiffers(baseIds, tgtIds))
    out.push({ id: 'skills:groups', kind: 'skills-groups', label: 'Reorder skill groups' })
  for (const tg of target.skillGroups) {
    const bg = base.skillGroups.find((g) => g.groupId === tg.groupId)
    if (bg && !sameArr(bg.items, tg.items)) {
      const label = ev.skillGroups.find((g) => g.id === tg.groupId)?.label ?? tg.groupId
      out.push({ id: `skills:${tg.groupId}`, kind: 'skills-order', groupId: tg.groupId, label: `Reorder ${label}` })
    }
  }
  return out
}

export function applySuggestions(ev: Evidence, base: Plan, target: Plan, accepted: string[]): Plan {
  const acc = new Set(accepted)
  const all = diffPlans(ev, base, target)
  const on = (id: string) => acc.has(id)
  const experiences: Plan['experiences'] = []
  const bold: Plan['bold'] = []

  for (const exp of ev.experiences) {
    const b = sel(base, exp.id), t = sel(target, exp.id)
    const kept = b.filter((id) => !on(`bullet-:${id}`))
    const adds = t.filter((id) => !b.includes(id) && on(`bullet+:${id}`))
    let ids: string[]
    if (on(`order:${exp.id}`)) {
      const final = new Set([...kept, ...adds])
      const inTarget = t.filter((id) => final.has(id))
      ids = [...inTarget, ...kept.filter((id) => !inTarget.includes(id))]
    } else {
      ids = [...kept, ...adds]
    }
    experiences.push({ experienceId: exp.id, bulletIds: ids })
    for (const id of ids) {
      let terms = [...baseline(ev, base, id)]
      for (const s of all) {
        if (s.bulletId !== id || !s.term || !on(s.id)) continue
        if (s.kind === 'bold-add' && !terms.includes(s.term)) terms.push(s.term)
        if (s.kind === 'bold-remove') terms = terms.filter((x) => x !== s.term)
      }
      bold.push({ bulletId: id, terms })
    }
  }

  const tgtItems = new Map(target.skillGroups.map((g) => [g.groupId, g.items]))
  const withItems = base.skillGroups.map((g) => ({
    groupId: g.groupId,
    items: on(`skills:${g.groupId}`) && tgtItems.has(g.groupId) ? [...tgtItems.get(g.groupId)!] : [...g.items],
  }))
  let skillGroups = withItems
  if (on('skills:groups')) {
    const order = target.skillGroups.map((g) => g.groupId)
    const pos = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length)
    skillGroups = [...withItems].sort((a, b) => pos(a.groupId) - pos(b.groupId))
  }

  return normalizePlan({ profile: base.profile, experiences, bold, skillGroups }, ev)
}

export function displayDiff(
  ev: Evidence, base: Plan, current: Plan,
): { sections: DiffSection[]; skills: SkillsDiff[] } {
  const sections: DiffSection[] = []
  for (const exp of ev.experiences) {
    const b = sel(base, exp.id), c = sel(current, exp.id)
    const textOf = (id: string) => exp.bullets.find((x) => x.id === id)?.text ?? id
    const commonBase = b.filter((id) => c.includes(id))
    const commonCur = c.filter((id) => b.includes(id))
    const rows: DiffRow[] = c.map((id) => {
      const inBase = b.includes(id)
      const from = baseline(ev, base, id), to = boldOf(current, id)
      const status = !inBase ? 'added' : commonBase.indexOf(id) !== commonCur.indexOf(id) ? 'moved' : 'kept'
      return {
        bulletId: id, text: textOf(id), status,
        boldAdded: to.filter((x) => !from.includes(x)),
        boldRemoved: from.filter((x) => !to.includes(x)),
      }
    })
    for (const id of b.filter((x) => !c.includes(x)))
      rows.push({ bulletId: id, text: textOf(id), status: 'removed', boldAdded: [], boldRemoved: [] })
    if (rows.length) sections.push({ experienceId: exp.id, company: exp.company, rows })
  }
  const skills = current.skillGroups.map((g) => ({
    groupId: g.groupId,
    label: ev.skillGroups.find((x) => x.id === g.groupId)?.label ?? g.groupId,
    before: base.skillGroups.find((x) => x.groupId === g.groupId)?.items ?? [],
    after: g.items,
  }))
  return { sections, skills }
}
