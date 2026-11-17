import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { validatePlan } from '../validate'
import { buildBasePlan, buildFullPlan } from '../base'
import { applySuggestions, diffPlans, displayDiff, normalizePlan } from '../suggestions'
import type { Plan } from '../types'

const ev = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))
const base = () => buildBasePlan(ev, 'senior-fullstack')
const ids = (b: Plan, t: Plan) => diffPlans(ev, b, t).map((s) => s.id)

const target = (): Plan => ({
  profile: 'senior-fullstack',
  experiences: [
    { experienceId: 'beta', bulletIds: ['beta-3', 'beta-2', 'beta-1'] },
    { experienceId: 'acme', bulletIds: ['acme-4', 'acme-1', 'acme-3'] },
  ],
  bold: [
    { bulletId: 'acme-4', terms: ['junior', 'Mentored'] },
    { bulletId: 'beta-1', terms: [] },
  ],
  skillGroups: [
    { groupId: 'fe', items: ['Vue.js', 'React'] },
    { groupId: 'lang', items: ['C++', 'Python', 'TypeScript'] },
  ],
})

describe('buildBasePlan', () => {
  it('selects tagged bullets, default bold, profile skill order', () => {
    const p = base()
    expect(p.experiences).toEqual([
      { experienceId: 'acme', bulletIds: ['acme-1', 'acme-2', 'acme-4'] },
      { experienceId: 'beta', bulletIds: ['beta-2'] },
    ])
    expect(p.bold).toEqual([{ bulletId: 'acme-1', terms: ['Node.js'] }, { bulletId: 'acme-2', terms: ['50%'] }])
    expect(p.skillGroups.map((g) => g.groupId)).toEqual(['lang', 'fe'])
    expect(validatePlan(p, ev).ok).toBe(true)
  })
  it('falls back to first bullet when none tagged', () => {
    const p = buildBasePlan(ev, 'ai-engineer')
    expect(p.experiences.find((e) => e.experienceId === 'beta')!.bulletIds).toEqual(['beta-2'])
    const ev2 = structuredClone(ev)
    ev2.experiences[1].bullets.forEach((b) => (b.profiles = ['senior-frontend']))
    expect(buildBasePlan(ev2, 'ai-engineer').experiences[1].bulletIds).toEqual(['beta-1'])
  })
  it('full plan selects every bullet', () => {
    const p = buildFullPlan(ev, 'senior-fullstack')
    expect(p.experiences[0].bulletIds).toHaveLength(4)
    expect(p.experiences[1].bulletIds).toHaveLength(3)
    expect(validatePlan(p, ev).ok).toBe(true)
  })
})

describe('suggestions', () => {
  it('identical plans give no suggestions', () => {
    expect(diffPlans(ev, base(), base())).toEqual([])
  })
  it('apply all reproduces normalised target; valid plan', () => {
    const t = target()
    const out = applySuggestions(ev, base(), t, ids(base(), t))
    expect(out).toEqual(normalizePlan(t, ev))
    expect(validatePlan(out, ev).ok).toBe(true)
  })
  it('apply none reproduces base', () => {
    expect(applySuggestions(ev, base(), target(), [])).toEqual(normalizePlan(base(), ev))
  })
  it('emits expected ids', () => {
    expect(ids(base(), target())).toEqual(expect.arrayContaining([
      'bullet+:acme-3', 'bullet-:acme-2', 'order:acme', 'bold-:acme-1:Node.js'.replace('acme-1', 'acme-1'),
      'bold+:acme-4:junior', 'bold+:acme-4:Mentored', 'bullet+:beta-1', 'bullet+:beta-3',
      'skills:groups', 'skills:lang',
    ]))
  })
  it('accepting only bullet+:acme-4 appends in base order', () => {
    const b = base()
    b.experiences[0].bulletIds = ['acme-1', 'acme-2']
    const t = base()
    const out = applySuggestions(ev, b, t, ['bullet+:acme-4'])
    expect(out.experiences[0].bulletIds).toEqual(['acme-1', 'acme-2', 'acme-4'])
  })
  it('dropped default bold yields bold- suggestion', () => {
    const t = base()
    t.bold = t.bold.filter((x) => x.bulletId !== 'acme-1')
    t.bold.push({ bulletId: 'acme-1', terms: [] })
    t.bold = t.bold.map((x) => x)
    const tt: Plan = { ...t, bold: [{ bulletId: 'acme-2', terms: ['50%'] }] }
    expect(ids(base(), tt)).toContain('bold-:acme-1:Node.js')
    const bt: Plan = { ...base(), bold: [{ bulletId: 'acme-1', terms: ['Node.js'] }, { bulletId: 'acme-2', terms: ['50%'] }] }
    const wanted = { ...bt, bold: [{ bulletId: 'acme-2', terms: ['50%'] }] }
    expect(ids(bt, wanted)).toEqual(['bold-:acme-1:Node.js'])
  })
  it('bold baseline for newly added bullet is its default', () => {
    const t = { ...base() }
    t.experiences = [{ experienceId: 'acme', bulletIds: ['acme-1', 'acme-2', 'acme-4'] }, { experienceId: 'beta', bulletIds: ['beta-2', 'beta-1'] }]
    t.bold = [...base().bold, { bulletId: 'beta-1', terms: ['React'] }]
    expect(ids(base(), t)).toEqual(['bullet+:beta-1'])
    t.bold = base().bold
    expect(ids(base(), t)).toEqual(['bullet+:beta-1', 'bold-:beta-1:React'])
  })
  it('order only when relative order of common bullets differs', () => {
    const t = base()
    t.experiences[0].bulletIds = ['acme-4', 'acme-1', 'acme-2']
    expect(ids(base(), t)).toEqual(['order:acme'])
    const t2 = base()
    t2.experiences[0].bulletIds = ['acme-1', 'acme-4']
    expect(ids(base(), t2)).toEqual(['bullet-:acme-2'])
  })
  it('normalizePlan orders and drops', () => {
    const n = normalizePlan(target(), ev)
    expect(n.experiences.map((e) => e.experienceId)).toEqual(['acme', 'beta'])
    expect(n.bold).toEqual([{ bulletId: 'acme-4', terms: ['Mentored', 'junior'] }])
  })
})

describe('displayDiff', () => {
  it('marks removed, added, moved and skills', () => {
    const d = displayDiff(ev, base(), target())
    const acme = d.sections.find((s) => s.experienceId === 'acme')!
    const st = Object.fromEntries(acme.rows.map((r) => [r.bulletId, r.status]))
    expect(st).toEqual({ 'acme-4': 'moved', 'acme-1': 'moved', 'acme-3': 'added', 'acme-2': 'removed' })
    expect(acme.rows.find((r) => r.bulletId === 'acme-1')!.boldRemoved).toEqual(['Node.js'])
    expect(d.skills.find((s) => s.groupId === 'lang')).toMatchObject({ label: 'Languages', before: ['Python', 'TypeScript', 'C++'], after: ['C++', 'Python', 'TypeScript'] })
  })
})
