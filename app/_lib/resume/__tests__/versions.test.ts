import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { buildBasePlan } from '../base'
import { diffPlans, normalizePlan } from '../suggestions'
import { MAX_PAGE_FILL, parsePageFill } from '../compile'
import type { JdAnalysis, LlmPlan } from '../types'
import {
  makeVersionId, versionDir, createVersion, readVersionView, updateVersion, finalizeVersion, rebuild,
  VersionIdError, VersionFrozenError, VersionNotFoundError, FinalizeNotAllowedError, PlanInvalidError,
  ManualModeError, BadInputError, MAX_MANUAL_TEX,
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
let warnings: string[] = []
let lastTex: string | null = null
/** Fake pdflatex: on success "produces" a PDF whose content is the tex, so tests can tell which build is on disk. */
const compile = async (tex: string, dir: string) => {
  lastTex = tex
  if (fail) throw new Error('boom')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'cv.pdf'), tex)
  return { pdfPath: join(dir, 'cv.pdf'), pageFill: fill, warnings }
}
let root: string
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'rv-')); fill = 1.0; fail = false; warnings = []; lastTex = null })
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

describe('finalize gates', () => {
  it('layout warnings block finalize and are exposed on the view', async () => {
    warnings = ['Overfull hbox 211.0pt in alignment at lines 96--103']
    const id = await mk()
    const v = readVersionView(id, root)
    expect(v.layoutWarnings).toEqual(warnings)
    expect(v.pageFill).toBe(1.0)
    expect(v.canFinalize).toBe(false)
    await expect(finalizeVersion(id, root)).rejects.toThrow(/Overfull hbox 211.0pt/)
    warnings = []
    await updateVersion(id, { accepted: [] }, root, { compile })
    expect(readVersionView(id, root).canFinalize).toBe(true)
  })
  it('unrounded fill just over the limit (~1.504) blocks finalize', async () => {
    const h = 845.04684, M = 0.6 * 72.27
    const ySp = Math.round((h - M - 0.504 * (h - 2 * M)) * 65536)
    fill = parsePageFill(`\\resumeend{2}{${ySp}}{${h}pt}`)
    expect(fill!).toBeGreaterThan(MAX_PAGE_FILL)
    expect(fill!).toBeCloseTo(1.504, 3)
    const id = await mk()
    expect(readVersionView(id, root).canFinalize).toBe(false)
    await expect(finalizeVersion(id, root)).rejects.toBeInstanceOf(FinalizeNotAllowedError)
  })
  it('interrupted compile after an update leaves pageFill null and canFinalize false', async () => {
    const id = await mk()
    expect(readVersionView(id, root).canFinalize).toBe(true)
    let started!: () => void
    const startedP = new Promise<void>((r) => { started = r })
    let release!: () => void
    const hang = (_t: string, d: string) => {
      started()
      return new Promise<{ pdfPath: string; pageFill: number; warnings: string[] }>((r) => {
        release = () => r({ pdfPath: join(d, 'cv.pdf'), pageFill: 1, warnings: [] })
      })
    }
    const pending = updateVersion(id, { accepted: [] }, root, { compile: hang })
    await startedP
    const mid = readVersionView(id, root)
    expect(mid.pageFill).toBeNull()
    expect(mid.compileError).toBeUndefined()
    expect(mid.layoutWarnings).toEqual([])
    expect(mid.canFinalize).toBe(false)
    release()
    await pending
    expect(readVersionView(id, root).canFinalize).toBe(true)
  })
  it('rejects an invalid llmPlan on create and on update', async () => {
    const bad = { ...llmPlan, experiences: llmPlan.experiences.slice(0, 1) }
    await expect(createVersion({ jd, llmPlan: bad }, yamlText, root, { compile })).rejects.toBeInstanceOf(PlanInvalidError)
    const id = await mk()
    await expect(updateVersion(id, { llmPlan: bad }, root, { compile })).rejects.toBeInstanceOf(PlanInvalidError)
  })
  it('createVersion keeps only accepted ids that exist', async () => {
    const all = diffPlans(ev, buildBasePlan(ev, 'senior-fullstack'), llmPlan).map((s) => s.id)
    const id = await createVersion({ jd, llmPlan, accepted: [all[0], 'gone:xyz'] }, yamlText, root, { compile })
    expect(readVersionView(id, root).accepted).toEqual([all[0]])
  })
})

describe('manual mode', () => {
  const pdfOf = (id: string) => readFileSync(join(versionDir(id, root), 'cv.pdf'), 'utf8')
  it('non-manual view exposes generatedTex as tex and compiles it', async () => {
    const id = await mk()
    const v = readVersionView(id, root)
    expect(v.manual).toBe(false); expect(v.tex).toBe(v.generatedTex); expect(v.manualDiff).toEqual([])
    expect(pdfOf(id)).toBe(v.generatedTex)
  })
  it('manualTex persists and view.tex returns it; generatedTex unchanged', async () => {
    const id = await mk(); const gen = readVersionView(id, root).generatedTex
    await updateVersion(id, { manualTex: gen + '\n% edited' }, root, { compile })
    const v = readVersionView(id, root)
    expect(v.manual).toBe(true); expect(v.tex).toBe(gen + '\n% edited'); expect(v.generatedTex).toBe(gen)
    expect(v.manualEditedAt).toBeTruthy()
    expect(lastTex).toBe(gen + '\n% edited'); expect(pdfOf(id)).toBe(gen + '\n% edited')
    expect(v.manualDiff.length).toBe(1)
  })
  it('accepted / llmPlan patches are refused in manual mode', async () => {
    const id = await mk(); await updateVersion(id, { manualTex: 'x' }, root, { compile })
    await expect(updateVersion(id, { accepted: [] }, root, { compile })).rejects.toThrow(ManualModeError)
    await expect(updateVersion(id, { llmPlan }, root, { compile })).rejects.toThrow(ManualModeError)
  })
  it('manualTex: null discards and recompiles the generated tex', async () => {
    const id = await mk(); await updateVersion(id, { manualTex: 'x' }, root, { compile })
    await updateVersion(id, { manualTex: null }, root, { compile })
    const v = readVersionView(id, root)
    expect(v.manual).toBe(false); expect(v.manualDiff).toEqual([]); expect(v.manualEditedAt).toBeUndefined()
    expect(lastTex).toBe(v.generatedTex); expect(pdfOf(id)).toBe(v.generatedTex)
  })
  it('empty manualTex is manual mode, not discard', async () => {
    const id = await mk(); await updateVersion(id, { manualTex: '' }, root, { compile })
    expect(readVersionView(id, root).manual).toBe(true); expect(lastTex).toBe('')
  })
  it('manualTex over MAX_MANUAL_TEX is rejected', async () => {
    const id = await mk()
    await expect(updateVersion(id, { manualTex: 'x'.repeat(MAX_MANUAL_TEX + 1) }, root, { compile })).rejects.toThrow(BadInputError)
    expect(readVersionView(id, root).manual).toBe(false)
  })
  it('manual compile failure keeps previous pdf and blocks finalize', async () => {
    const id = await mk(); await updateVersion(id, { manualTex: 'good' }, root, { compile })
    fail = true; await updateVersion(id, { manualTex: 'bad' }, root, { compile })
    const v = readVersionView(id, root)
    expect(pdfOf(id)).toBe('good')
    expect(v.compileError).toContain('boom'); expect(v.pageFill).toBe(1.0); expect(v.canFinalize).toBe(false)
    await expect(finalizeVersion(id, root)).rejects.toBeInstanceOf(FinalizeNotAllowedError)
    fail = false; await updateVersion(id, { manualTex: 'fixed' }, root, { compile })
    expect(readVersionView(id, root).canFinalize).toBe(true)
  })
  it('non-manual compile failure still deletes the pdf', async () => {
    const id = await mk(); fail = true; await updateVersion(id, { accepted: [] }, root, { compile })
    expect(existsSync(join(versionDir(id, root), 'cv.pdf'))).toBe(false)
  })
  it('interrupted manual compile leaves canFinalize false', async () => {
    const id = await mk()
    expect(readVersionView(id, root).canFinalize).toBe(true)
    let started!: () => void
    const startedP = new Promise<void>((r) => { started = r })
    const hang = () => { started(); return new Promise<never>(() => {}) }
    void updateVersion(id, { manualTex: 'x' }, root, { compile: hang })
    await startedP
    expect(readVersionView(id, root).canFinalize).toBe(false)
  })
  it('coverageFinal is computed from manualTex', async () => {
    const id = await mk()
    expect(readVersionView(id, root).coverageFinal.keywords.covered).toBe(1)
    await updateVersion(id, { manualTex: '\\begin{document}nothing here\\end{document}' }, root, { compile })
    const v = readVersionView(id, root)
    expect(v.coverageFinal.keywords.covered).toBe(0); expect(v.coverageBase.keywords.covered).toBe(1)
  })
  it('manual edits on a final version are frozen', async () => {
    const id = await mk(); await finalizeVersion(id, root)
    await expect(updateVersion(id, { manualTex: 'x' }, root, { compile })).rejects.toThrow(VersionFrozenError)
  })
  it('createVersion with manualTex starts in manual mode', async () => {
    const id = await createVersion({ jd, llmPlan, manualTex: 'mine' }, yamlText, root, { compile })
    expect(readVersionView(id, root).tex).toBe('mine'); expect(pdfOf(id)).toBe('mine')
  })
})
