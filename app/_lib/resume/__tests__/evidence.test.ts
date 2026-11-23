import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEvidence, evidenceForPrompt } from '../evidence'
import { PROFILE_IDS } from '../types'

const fixture = readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8')

describe('parseEvidence', () => {
  it('parses fixture', () => {
    const ev = parseEvidence(fixture)
    expect(ev.experiences[0].bullets.length).toBe(4)
    expect(ev.profiles.map(p => p.id)).toEqual(PROFILE_IDS)
  })

  it('defaults missing aliases to {}', () => {
    const ev = parseEvidence(fixture.replace(/aliases:\n {2}Kubernetes: \[k8s\]\n/, ''))
    expect(ev.aliases).toEqual({})
  })

  it('rejects duplicate ids', () => {
    const bad = fixture.replace('id: acme-2', 'id: acme-1')
    expect(() => parseEvidence(bad)).toThrow('duplicate id "acme-1"')
  })

  it('rejects unknown profile tag', () => {
    const bad = fixture.replace('profiles: [ai-engineer]\n        bold: []', 'profiles: [ml-guru]\n        bold: []')
    expect(() => parseEvidence(bad)).toThrow('unknown profile "ml-guru"')
  })

  it('rejects default bold not in text', () => {
    const bad = fixture.replace('bold: [Node.js]', 'bold: [Kafka]')
    expect(() => parseEvidence(bad)).toThrow('bold "Kafka" not found in bullet')
  })

  it('rejects profile skillGroups referencing unknown group', () => {
    const bad = fixture.replace('skillGroups: [lang]', 'skillGroups: [nope]')
    expect(() => parseEvidence(bad)).toThrow(/unknown skill group "nope"/)
  })
})

describe('evidenceForPrompt', () => {
  it('contains every bullet id', () => {
    const ev = parseEvidence(fixture)
    const out = evidenceForPrompt(ev)
    for (const e of ev.experiences) for (const b of e.bullets) expect(out).toContain(b.id)
  })
  it('includes each bullet\'s default bold list', () => {
    const ev = parseEvidence(fixture)
    const parsed = JSON.parse(evidenceForPrompt(ev))
    const bullets = parsed.experiences.flatMap((e: { bullets: unknown[] }) => e.bullets)
    const all = ev.experiences.flatMap(e => e.bullets)
    expect(bullets.map((b: { bold: string[] }) => b.bold)).toEqual(all.map(b => b.bold))
    expect(all.some(b => b.bold.length > 0)).toBe(true)
  })
})
