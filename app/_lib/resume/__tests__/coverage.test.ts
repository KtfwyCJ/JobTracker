import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { buildBasePlan } from '../base'
import { termOccursIn, termMatches, computeCoverage } from '../coverage'
import { evidenceGaps } from '../gaps'
import type { JdAnalysis } from '../types'

const ev = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))

describe('termOccursIn', () => {
  it('respects word boundaries and literals', () => {
    expect(termOccursIn('JavaScript', 'Java', false)).toBe(false)
    expect(termOccursIn('Built with C++ and more', 'C++', false)).toBe(true)
    expect(termOccursIn('Cut load by 50% today', '50%', false)).toBe(true)
    expect(termOccursIn('uses react', 'React', true)).toBe(false)
    expect(termOccursIn('uses react', 'React', false)).toBe(true)
    expect(termOccursIn('abc', '', false)).toBe(false)
  })
})

describe('termMatches', () => {
  it('matches literals and boundaries', () => {
    expect(termMatches('Built with C++ and k8s', 'C++', {})).toBe(true)
    expect(termMatches('JavaScript', 'Java', {})).toBe(false)
  })
  it('expands aliases in both directions', () => {
    const a = { Kubernetes: ['k8s', 'kube'] }
    expect(termMatches('uses k8s', 'Kubernetes', a)).toBe(true)
    expect(termMatches('uses Kubernetes', 'k8s', a)).toBe(true)
    expect(termMatches('uses kube', 'k8s', a)).toBe(true)
    expect(termMatches('uses KUBERNETES', 'K8S', a)).toBe(true)
    expect(termMatches('uses docker', 'k8s', a)).toBe(false)
  })
})

describe('computeCoverage', () => {
  const jd: JdAnalysis = {
    mustHave: [
      { text: 'Node', keywords: ['Node.js'] },
      { text: 'Orchestration', keywords: ['Kubernetes'] },
      { text: 'Streaming', keywords: ['Kafka', 'Pulsar'] },
    ],
    plus: [{ text: 'Empty', keywords: [] }],
    keywords: ['Node.js', 'node.js', 'Kubernetes', 'Kafka'],
  }
  const c = computeCoverage(jd, 'Built Node.js services on k8s', ev.aliases)
  it('counts covered requirements', () => {
    expect(c.mustHave.covered).toBe(2)
    expect(c.mustHave.total).toBe(3)
    expect(c.mustHave.items[1].matched).toEqual(['Kubernetes'])
    expect(c.mustHave.items[2].covered).toBe(false)
  })
  it('treats empty keywords as uncovered but counted', () => {
    expect(c.plus).toMatchObject({ covered: 0, total: 1 })
  })
  it('dedupes keywords case-insensitively', () => {
    expect(c.keywords.total).toBe(3)
    expect(c.keywords.covered).toBe(2)
    expect(c.keywords.items[0]).toEqual({ text: 'Node.js', covered: true, matched: ['Node.js'] })
  })
})

describe('evidenceGaps', () => {
  it('splits missing vs available-not-selected', () => {
    const jd: JdAnalysis = { mustHave: [{ text: 'x', keywords: ['Kafka'] }], plus: [], keywords: ['Node.js', 'retrieval', 'Kafka'] }
    const g = evidenceGaps(jd, ev, buildBasePlan(ev, 'senior-fullstack'))
    expect(g.missingFromEvidence).toEqual(['Kafka'])
    expect(g.availableNotSelected).toEqual(['retrieval'])
  })
})
