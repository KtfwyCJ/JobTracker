import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { buildBasePlan } from '../base'
import { escapeLatex, renderTex, renderPlainText } from '../render'
import { findTermSpan } from '../coverage'
import type { Plan } from '../types'

const ev = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))
const plan: Plan = {
  profile: 'senior-fullstack',
  experiences: [
    { experienceId: 'acme', bulletIds: ['acme-2', 'acme-1'] },
    { experienceId: 'beta', bulletIds: ['beta-2'] },
  ],
  bold: [{ bulletId: 'acme-1', terms: ['Node.js'] }, { bulletId: 'acme-2', terms: ['50%'] }],
  skillGroups: [{ groupId: 'fe', items: ['Vue.js', 'React'] }, { groupId: 'lang', items: ['Python', 'C++'] }],
}

describe('findTermSpan', () => {
  it('finds boundary-respecting spans', () => {
    expect(findTermSpan('Java and JavaScript', 'Java', true)).toEqual({ start: 0, end: 4 })
    expect(findTermSpan('JavaScript', 'Java', true)).toBeNull()
    expect(findTermSpan('java', 'Java', false)).toEqual({ start: 0, end: 4 })
  })
})

describe('escapeLatex', () => {
  it('escapes specials', () => {
    expect(escapeLatex('50% R&D C# a_b')).toBe('50\\% R\\&D C\\# a\\_b')
    expect(escapeLatex('\\ $ { } ~ ^')).toBe('\\textbackslash{} \\$ \\{ \\} \\textasciitilde{} \\textasciicircum{}')
  })
})

describe('renderTex', () => {
  const tex = renderTex(ev, plan)
  it('fills all slots and bolds first occurrence once', () => {
    expect(tex).not.toContain('%%')
    expect(tex.split('\\textbf{Node.js}').length - 1).toBe(1)
    expect(tex).toContain('\\textbf{50\\%}')
    expect(tex).toContain('\\resumeend')
  })
  it('keeps plan bullet order and omits unselected', () => {
    expect(tex.indexOf('Cut page load')).toBeLessThan(tex.indexOf('Built a '))
    expect(tex).toContain('Wrote Python tooling')
    expect(tex).not.toContain('Mentored three')
    expect(tex).not.toContain('retrieval pipeline')
  })
  it('renders skills in plan order and omits empty sections', () => {
    expect(tex.indexOf('Frontend')).toBeLessThan(tex.indexOf('Languages}'))
    expect(tex.indexOf('Vue.js')).toBeLessThan(tex.indexOf('React'))
    const noRes = renderTex({ ...ev, research: [] }, plan)
    expect(noRes).not.toContain('Research')
    expect(tex).toContain('Research')
  })
  it('contact line has mailto', () => {
    expect(tex).toContain('\\href{mailto:ada@example.com}{ada@example.com}')
  })
})

describe('renderPlainText', () => {
  it('keeps raw characters', () => {
    const t = renderPlainText(ev, buildBasePlan(ev, 'senior-frontend'))
    expect(t).toContain('50%')
    expect(t).not.toContain('\\%')
  })
})
