import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { validatePlan } from '../validate'

const ev = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))

const goodPlan = (): any => ({
  profile: 'senior-fullstack',
  experiences: [
    { experienceId: 'acme', bulletIds: ['acme-1', 'acme-2'] },
    { experienceId: 'beta', bulletIds: ['beta-1', 'beta-3'] },
  ],
  bold: [{ bulletId: 'acme-1', terms: ['Node.js'] }],
  skillGroups: [
    { groupId: 'fe', items: ['Vue.js', 'React'] },
    { groupId: 'lang', items: ['Python', 'TypeScript', 'C++'] },
  ],
})

const errs = (r: ReturnType<typeof validatePlan>) => (r.ok ? [] : r.errors).join('\n')

describe('validatePlan', () => {
  it('accepts goodPlan and returns normalized copy', () => {
    const raw = { ...goodPlan() }
    const r = validatePlan(raw, ev)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.plan).toEqual(goodPlan())
  })

  it('strips nothing silently: rejects non-objects', () => {
    for (const bad of [null, 'x', 5, [], undefined]) expect(validatePlan(bad, ev).ok).toBe(false)
  })

  it('rejects extra top-level key', () => {
    const r = validatePlan({ ...goodPlan(), summary: 'hi' }, ev)
    expect(errs(r)).toContain('unexpected field "summary"')
  })

  it('rejects unknown profile', () => {
    expect(validatePlan({ ...goodPlan(), profile: 'wizard' }, ev).ok).toBe(false)
  })

  it('rejects missing and unknown experience', () => {
    const p = goodPlan()
    p.experiences = [p.experiences[0]]
    expect(errs(validatePlan(p, ev))).toContain('missing experience "beta"')
    const q = goodPlan()
    q.experiences.push({ experienceId: 'zzz', bulletIds: ['x'] })
    expect(errs(validatePlan(q, ev))).toContain('unknown experience "zzz"')
  })

  it('rejects bullet from other experience', () => {
    const p = goodPlan()
    p.experiences[0].bulletIds.push('beta-1')
    expect(errs(validatePlan(p, ev))).toContain('bullet "beta-1" does not belong to "acme"')
  })

  it('rejects duplicate bullet id and empty bulletIds', () => {
    const p = goodPlan()
    p.experiences[0].bulletIds = ['acme-1', 'acme-1']
    expect(errs(validatePlan(p, ev))).toContain('duplicate bullet "acme-1"')
    const q = goodPlan()
    q.experiences[0].bulletIds = []
    expect(errs(validatePlan(q, ev))).toContain('experience "acme" has no bullets')
  })

  describe('bold', () => {
    const withBold = (bulletId: string, terms: string[]) => {
      const p = goodPlan()
      p.bold = [{ bulletId, terms }]
      return validatePlan(p, ev)
    }
    it('accepts Node.js', () => expect(withBold('acme-1', ['Node.js']).ok).toBe(true))
    it('rejects case mismatch', () => expect(withBold('acme-1', ['node.js']).ok).toBe(false))
    it('accepts Node before dot', () => expect(withBold('acme-1', ['Node']).ok).toBe(true))
    it('rejects Type inside TypeScript', () => expect(withBold('beta-3', ['Type']).ok).toBe(false))
    it('rejects bold on unselected bullet', () => expect(withBold('acme-3', ['retrieval']).ok).toBe(false))
    it('rejects overlapping terms', () => {
      const r = withBold('beta-3', ['React', 'React Native'])
      expect(errs(r)).toContain('overlap')
    })
    it('accepts non-overlapping terms', () => expect(withBold('beta-3', ['React Native', 'TypeScript']).ok).toBe(true))
  })

  describe('skills', () => {
    it('rejects added item', () => {
      const p = goodPlan(); p.skillGroups[0].items.push('Svelte')
      expect(validatePlan(p, ev).ok).toBe(false)
    })
    it('rejects removed item', () => {
      const p = goodPlan(); p.skillGroups[0].items.pop()
      expect(validatePlan(p, ev).ok).toBe(false)
    })
    it('rejects unknown group', () => {
      const p = goodPlan(); p.skillGroups.push({ groupId: 'nope', items: [] })
      expect(errs(validatePlan(p, ev))).toContain('unknown skill group "nope"')
    })
    it('rejects missing group', () => {
      const p = goodPlan(); p.skillGroups.pop()
      expect(errs(validatePlan(p, ev))).toContain('missing skill group "lang"')
    })
  })

  describe('requireLlmFields', () => {
    const opts = { requireLlmFields: true }
    it('requires profileReason and fit', () => {
      expect(validatePlan(goodPlan(), ev, opts).ok).toBe(false)
      expect(validatePlan({ ...goodPlan(), profileReason: 'r', fit: 'maybe' }, ev, opts).ok).toBe(false)
      expect(validatePlan({ ...goodPlan(), profileReason: 1, fit: 'good' }, ev, opts).ok).toBe(false)
    })
    it('accepts valid llm plan', () => {
      const r = validatePlan({ ...goodPlan(), profileReason: 'r', fit: 'low' }, ev, opts)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.plan).toMatchObject({ profileReason: 'r', fit: 'low' })
    })
  })

  it('never throws on garbage', () => {
    const garbage = [{ profile: 1, experiences: 'x', bold: null, skillGroups: {} },
      { experiences: [null, 3, { experienceId: 1, bulletIds: 'a' }], bold: [null, { terms: 5 }], skillGroups: [null] }]
    for (const g of garbage) expect(() => validatePlan(g, ev, { requireLlmFields: true })).not.toThrow()
    expect(validatePlan(garbage[0], ev).ok).toBe(false)
  })
})
