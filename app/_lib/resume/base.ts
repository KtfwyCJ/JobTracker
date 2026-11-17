import type { Evidence, Plan, ProfileId } from './types'

function skillGroupsFor(ev: Evidence, profile: ProfileId): Plan['skillGroups'] {
  const preferred = ev.profiles.find((p) => p.id === profile)?.skillGroups ?? []
  const byId = new Map(ev.skillGroups.map((g) => [g.id, g]))
  const ordered = [
    ...preferred.filter((id) => byId.has(id)),
    ...ev.skillGroups.map((g) => g.id).filter((id) => !preferred.includes(id)),
  ]
  return ordered.map((groupId) => ({ groupId, items: [...byId.get(groupId)!.items] }))
}

function build(ev: Evidence, profile: ProfileId, all: boolean): Plan {
  const experiences: Plan['experiences'] = []
  const bold: Plan['bold'] = []
  for (const exp of ev.experiences) {
    let picked = all ? exp.bullets : exp.bullets.filter((b) => b.profiles.includes(profile))
    if (picked.length === 0) picked = exp.bullets.slice(0, 1)
    experiences.push({ experienceId: exp.id, bulletIds: picked.map((b) => b.id) })
    for (const b of picked) if (b.bold.length) bold.push({ bulletId: b.id, terms: [...b.bold] })
  }
  return { profile, experiences, bold, skillGroups: skillGroupsFor(ev, profile) }
}

export const buildBasePlan = (ev: Evidence, profile: ProfileId): Plan => build(ev, profile, false)
export const buildFullPlan = (ev: Evidence, profile: ProfileId): Plan => build(ev, profile, true)
