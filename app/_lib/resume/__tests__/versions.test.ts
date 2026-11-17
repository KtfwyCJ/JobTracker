import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { buildBasePlan } from '../base'
import { diffPlans, normalizePlan } from '../suggestions'
import { MAX_PAGE_FILL } from '../compile'
import type { JdAnalysis, LlmPlan } from '../types'
import {
  makeVersionId, versionDir, createVersion, readVersionView, updateVersion, finalizeVersion, rebuild,
  VersionIdError, VersionFrozenError, VersionNotFoundError, FinalizeNotAllowedError,
} from '../versions'

const yamlText = readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8')
const ev = parseEvidence(yamlText)
const jd: JdAnalysis = { company: 'Acme', title: 'Eng', mustHave: [{ text: 'Node.js', keywords: ['Node.js'] }], plus: [], keywords: ['Node.js'] }
const llmPlan: LlmPlan = {
  profile: 'senior-fullstack', profileReason: 'x', fit: 'good',
  experiences: [
    { experienceId: 'beta', bulletIds: ['beta-3', 'beta-2', 'beta-1'] },
    { experienceId: 'acme', bulletIds: ['acme-4', 'acme-1', 'acme-3'] },
  ],
  bold: [{ bulletId: 'acme-4', terms: ['junior', 'Mentored'] }, { bulletId: 'beta-1', terms: [] }],
  skillGroups: [{ groupId: 'fe', items: ['Vue.js', 'React'] }, { groupId: 'lang', items: ['C++', 'Python', 'TypeScript'] }],
}
let fill: number | null = 1.0
let fail = false
const compile = async (tex: string, dir: string) => {
  if (fail) throw new Error('boom')
  void tex
  return { pdfPath: join(dir, 'cv.pdf'), pageFill: fill }
}
let root: string
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'rv-')); fill = 1.0; fail = false })
afterEach(() => rmSync(root, { recursive: true, force: true }))
const mk = () => createVersion({ jd, llmPlan }, yamlText, root, { compile })

describe('ids', () => {
  it('rejects bad ids before touching fs', () => {
    expect(() => versionDir('../x', root)).toThrow(VersionIdError)
    expect(() => versionDir('A', root)).toThrow(VersionIdError)
    expect(() => versionDir('', root)).toThrow(VersionIdError)
  })
  it('makeVersionId format', () => {
    expect(makeVersionId('Delivery Hero', 'Senior Engineer', new Date('2026-11-17'))).toMatch(/^20261117-delivery-hero-senior-engineer-[a-z0-9]{4}$/)
    expect(makeVersionId(undefined, undefined, new Date('2026-11-17'))).toMatch(/^20261117-[a-z0-9-]*[a-z0-9]{4}$/)
  })
})

describe('store', () => {
  it('create -> view accepts all, current equals normalized llmPlan', async () => {
    const id = await mk()
    expect(existsSync(join(versionDir(id, root), 'evidence.snapshot.yaml'))).toBe(true)
    expect(readFileSync(join(versionDir(id, root), 'evidence.snapshot.yaml'), 'utf8')).toBe(yamlText)
    const v = readVersionView(id, root)
    const base = buildBasePlan(ev, 'senior-fullstack')
    expect(v.accepted).toEqual(diffPlans(ev, base, llmPlan).map((s) => s.id))
    expect(v.current).toEqual(normalizePlan(llmPlan, ev))
    expect(v.pageFill).toBe(1.0)
    expect(v.canFinalize).toBe(true)
  })
  it('accepted [] gives base', async () => {
    const id = await mk()
    await updateVersion(id, { accepted: [] }, root, { compile })
    const v = readVersionView(id, root)
    expect(v.current).toEqual(normalizePlan(v.base, ev))
  })
  it('metadata patch does not need compile', async () => {
    const id = await mk()
    await updateVersion(id, { analysis: 'hi', gapsScore: 7 }, root, { compile: async () => { throw new Error('no') } })
    const v = readVersionView(id, root)
    expect(v.analysis).toBe('hi'); expect(v.gapsScore).toBe(7)
  })
  it('llmPlan replacement resets accepted', async () => {
    const id = await mk()
    await updateVersion(id, { accepted: [] }, root, { compile })
    await updateVersion(id, { llmPlan }, root, { compile })
    expect(readVersionView(id, root).accepted.length).toBeGreaterThan(0)
  })
  it('pageFill over max blocks finalize', async () => {
    fill = 1.6
    const id = await mk()
    expect(1.6).toBeGreaterThan(MAX_PAGE_FILL)
    expect(readVersionView(id, root).canFinalize).toBe(false)
    await expect(finalizeVersion(id, root)).rejects.toBeInstanceOf(FinalizeNotAllowedError)
  })
  it('compile failure is stored, not thrown', async () => {
    fail = true
    const id = await mk()
    const v = readVersionView(id, root)
    expect(v.compileError).toContain('boom'); expect(v.pageFill).toBeNull(); expect(v.canFinalize).toBe(false)
  })
  it('final is frozen', async () => {
    const id = await mk()
    await finalizeVersion(id, root)
    expect(readVersionView(id, root).status).toBe('final')
    await expect(updateVersion(id, { accepted: [] }, root, { compile })).rejects.toBeInstanceOf(VersionFrozenError)
    await expect(updateVersion(id, { analysis: 'x' }, root, { compile })).rejects.toBeInstanceOf(VersionFrozenError)
    await expect(rebuild(id, root, { compile })).rejects.toBeInstanceOf(VersionFrozenError)
  })
  it('missing version', () => {
    expect(() => readVersionView('nope', root)).toThrow(VersionNotFoundError)
  })
  it('concurrent updates serialize', async () => {
    const id = await mk()
    let active = 0, maxActive = 0
    const slow = async (t: string, d: string) => {
      active++; maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 20)); active--
      return compile(t, d)
    }
    await Promise.all([[], ['order:acme'], []].map((a) => updateVersion(id, { accepted: a }, root, { compile: slow })))
    expect(maxActive).toBe(1)
  })
})
