import fs from 'node:fs'
import path from 'node:path'
import type { Evidence, JdAnalysis, LlmPlan, Plan } from './types'
import { parseEvidence } from './evidence'
import { buildBasePlan } from './base'
import { applySuggestions, diffPlans, displayDiff, type Suggestion } from './suggestions'
import { validatePlan } from './validate'
import { renderPlainText, renderTex, texToPlainText } from './render'
import { compileTex, MAX_PAGE_FILL } from './compile'
import { computeCoverage, type Coverage } from './coverage'
import { evidenceGaps } from './gaps'
import { diffLines, type LineDiffHunk } from './textdiff'

export interface ResumeVersion {
  id: string; createdAt: string; status: 'draft' | 'final'; finalizedAt?: string
  jobUrl?: string; jd: JdAnalysis; jobText?: string; analysis?: string; gapsScore?: number
  llmPlan: LlmPlan; accepted: string[]; pageFill: number | null; compileError?: string
  /** Overfull-box warnings (> 2pt) from the last compile; any warning blocks finalize. */
  layoutWarnings?: string[]
  /** Hand-edited LaTeX. Present (even as "") = manual mode: it is what gets compiled and scored. */
  manualTex?: string
  manualEditedAt?: string
}
export interface VersionView extends ResumeVersion {
  layoutWarnings: string[]
  /** renderTex(evidence, current plan). */
  generatedTex: string
  /** What the editor shows: manualTex ?? generatedTex. */
  tex: string
  manual: boolean
  /** generatedTex → manualTex; [] outside manual mode. */
  manualDiff: LineDiffHunk[]
  base: Plan; current: Plan; suggestions: Suggestion[]; validationErrors: string[]
  diff: ReturnType<typeof displayDiff>; coverageBase: Coverage; coverageFinal: Coverage
  gaps: ReturnType<typeof evidenceGaps>; canFinalize: boolean
}

export class VersionIdError extends Error {}
export class VersionNotFoundError extends Error {}
export class VersionFrozenError extends Error {}
export class PlanInvalidError extends Error {
  constructor(readonly errors: string[]) { super(`Invalid plan:\n- ${errors.join('\n- ')}`) }
}
/** The request needs suggestions/plan to drive the CV, but the version is in manual LaTeX mode. */
export class ManualModeError extends Error {
  constructor(message = '已手动编辑，先放弃手改才能修改建议') { super(message) }
}
export class BadInputError extends Error {}
export const MAX_MANUAL_TEX = 200_000
/** Placeholder written before a manual compile; a crash mid-compile leaves it, so canFinalize stays false. */
const COMPILE_PENDING = 'Compile did not finish'

const isManual = (v: ResumeVersion) => v.manualTex !== undefined

export class FinalizeNotAllowedError extends Error {
  constructor(message: string, readonly validationErrors: string[] = [], readonly pageFill: number | null = null) { super(message) }
}

export type VersionDeps = { compile?: typeof compileTex }
export const VERSIONS_ROOT = path.join(process.cwd(), 'resume-versions')
const ID_RE = /^[a-z0-9-]{1,100}$/

const slug = (s: string | undefined) =>
  (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/, '')

export function makeVersionId(company: string | undefined, role: string | undefined, now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Array.from({ length: 4 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')
  return [date, slug(company), slug(role), rand].filter(Boolean).join('-')
}

export function versionDir(id: string, root = VERSIONS_ROOT): string {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new VersionIdError(`Invalid version id: ${String(id).slice(0, 40)}`)
  return path.join(root, id)
}

// ---- storage ----
const jsonPath = (id: string, root: string) => path.join(versionDir(id, root), 'version.json')
const snapshotPath = (id: string, root: string) => path.join(versionDir(id, root), 'evidence.snapshot.yaml')

function readVersion(id: string, root: string): ResumeVersion {
  const p = jsonPath(id, root)
  if (!fs.existsSync(p)) throw new VersionNotFoundError(`Version not found: ${id}`)
  return JSON.parse(fs.readFileSync(p, 'utf8')) as ResumeVersion
}
function writeVersion(v: ResumeVersion, root: string) {
  const p = jsonPath(v.id, root)
  const tmp = `${p}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(v, null, 2))
  fs.renameSync(tmp, p)
}
const readSnapshot = (id: string, root: string): Evidence => parseEvidence(fs.readFileSync(snapshotPath(id, root), 'utf8'))

/** Raw stored version (no derived fields). */
export const readVersionRecord = (id: string, root = VERSIONS_ROOT): ResumeVersion => readVersion(id, root)

/** Defence in depth: every stored llmPlan must pass the validator against its evidence. */
function assertValidLlmPlan(plan: LlmPlan, ev: Evidence) {
  const r = validatePlan(plan, ev, { requireLlmFields: true })
  if (!r.ok) throw new PlanInvalidError(r.errors)
}

// ---- per-id in-process lock (on globalThis so HMR / duplicate module instances share it) ----
const g = globalThis as typeof globalThis & { __resumeLocks?: Map<string, Promise<unknown>> }
const locks = (g.__resumeLocks ??= new Map<string, Promise<unknown>>())
function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(id) ?? Promise.resolve()).then(fn, fn)
  const tail = run.catch(() => undefined)
  locks.set(id, tail)
  void tail.then(() => { if (locks.get(id) === tail) locks.delete(id) })
  return run
}

// ---- computation ----
function compute(v: ResumeVersion, ev: Evidence) {
  const base = buildBasePlan(ev, v.llmPlan.profile)
  const current = applySuggestions(ev, base, v.llmPlan, v.accepted)
  const validation = validatePlan(current, ev)
  return { base, current, validationErrors: validation.ok ? [] : validation.errors }
}

async function rebuildLocked(id: string, root: string, deps?: VersionDeps): Promise<void> {
  const v = readVersion(id, root)
  if (v.status === 'final') throw new VersionFrozenError(`Version ${id} is final`)
  const ev = readSnapshot(id, root)
  const { current } = compute(v, ev)
  const dir = versionDir(id, root)
  // Build in a scratch dir and move the outputs over only on success, so a failed manual compile
  // leaves the last good PDF in place.
  const build = path.join(dir, '.build')
  try {
    const r = await (deps?.compile ?? compileTex)(v.manualTex ?? renderTex(ev, current), build)
    for (const f of ['cv.pdf', 'cv.tex']) {
      if (fs.existsSync(path.join(build, f))) fs.renameSync(path.join(build, f), path.join(dir, f))
    }
    v.pageFill = r.pageFill
    v.layoutWarnings = r.warnings
    delete v.compileError
  } catch (e) {
    v.compileError = e instanceof Error ? e.message : String(e)
    if (!isManual(v)) {
      v.pageFill = null
      v.layoutWarnings = []
      fs.rmSync(path.join(dir, 'cv.pdf'), { force: true })
    }
  }
  writeVersion(v, root)
}

export const rebuild = (id: string, root = VERSIONS_ROOT, deps?: VersionDeps) =>
  withLock(id, () => rebuildLocked(id, root, deps))

/** Create a fresh version dir; the leaf mkdir is non-recursive so an id collision throws instead of overwriting. */
function makeVersionDir(jd: JdAnalysis, root: string): string {
  fs.mkdirSync(root, { recursive: true })
  for (let attempt = 0; ; attempt++) {
    const id = makeVersionId(jd.company, jd.title)
    try {
      fs.mkdirSync(versionDir(id, root))
      return id
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST' || attempt >= 1) throw e
    }
  }
}

export async function createVersion(
  input: {
    jd: JdAnalysis; jobUrl?: string; jobText?: string; analysis?: string; gapsScore?: number; llmPlan: LlmPlan
    /** Suggestion ids to accept; ids not among the plan's suggestions are ignored. Default: all. */
    accepted?: string[]
    /** Start in manual mode with this LaTeX (duplicate of a hand-edited version). */
    manualTex?: string
  },
  evidenceYaml: string,
  root = VERSIONS_ROOT,
  deps?: VersionDeps,
): Promise<string> {
  const ev = parseEvidence(evidenceYaml)
  assertValidLlmPlan(input.llmPlan, ev)
  const id = makeVersionDir(input.jd, root)
  fs.writeFileSync(snapshotPath(id, root), evidenceYaml)
  const base = buildBasePlan(ev, input.llmPlan.profile)
  const { jd, jobUrl, jobText, analysis, gapsScore, llmPlan } = input
  const all = diffPlans(ev, base, llmPlan).map((s) => s.id)
  const accepted = input.accepted ? all.filter((s) => input.accepted!.includes(s)) : all
  writeVersion({
    id, createdAt: new Date().toISOString(), status: 'draft', jobUrl, jd, jobText, analysis, gapsScore, llmPlan,
    accepted, pageFill: null, layoutWarnings: [],
    ...(input.manualTex !== undefined && { manualTex: input.manualTex, manualEditedAt: new Date().toISOString() }),
  }, root)
  await rebuild(id, root, deps)
  return id
}

export function readVersionView(id: string, root = VERSIONS_ROOT): VersionView {
  const v = readVersion(id, root)
  const ev = readSnapshot(id, root)
  const { base, current, validationErrors } = compute(v, ev)
  const layoutWarnings = v.layoutWarnings ?? []
  const generatedTex = renderTex(ev, current)
  const manual = isManual(v)
  const canFinalize = validationErrors.length === 0 && !v.compileError && layoutWarnings.length === 0 &&
    v.pageFill !== null && v.pageFill <= MAX_PAGE_FILL
  return {
    ...v, layoutWarnings, base, current, validationErrors, canFinalize,
    generatedTex, tex: v.manualTex ?? generatedTex, manual,
    manualDiff: manual ? diffLines(generatedTex, v.manualTex!) : [],
    suggestions: diffPlans(ev, base, v.llmPlan),
    diff: displayDiff(ev, base, current),
    coverageBase: computeCoverage(v.jd, renderPlainText(ev, base), ev.aliases),
    coverageFinal: computeCoverage(v.jd, manual ? texToPlainText(v.manualTex!) : renderPlainText(ev, current), ev.aliases),
    gaps: evidenceGaps(v.jd, ev, current),
  }
}

export function updateVersion(
  id: string,
  patch: { accepted?: string[]; analysis?: string; gapsScore?: number; llmPlan?: LlmPlan; manualTex?: string | null },
  root = VERSIONS_ROOT,
  deps?: VersionDeps,
): Promise<void> {
  versionDir(id, root)
  return withLock(id, async () => {
    const v = readVersion(id, root)
    if (v.status === 'final') throw new VersionFrozenError(`Version ${id} is final`)
    if (isManual(v) && patch.manualTex === undefined && (patch.llmPlan || patch.accepted)) throw new ManualModeError()
    if (typeof patch.manualTex === 'string' && patch.manualTex.length > MAX_MANUAL_TEX) {
      throw new BadInputError(`manualTex exceeds ${MAX_MANUAL_TEX} characters`)
    }
    if (patch.analysis !== undefined) v.analysis = patch.analysis
    if (patch.gapsScore !== undefined) v.gapsScore = patch.gapsScore
    let needsRebuild = false
    if (typeof patch.manualTex === 'string') {
      v.manualTex = patch.manualTex
      v.manualEditedAt = new Date().toISOString()
      // Keep the last good measurement (and PDF) visible; the pending marker keeps canFinalize false
      // until this compile actually succeeds.
      v.compileError = COMPILE_PENDING
      writeVersion(v, root)
      await rebuildLocked(id, root, deps)
      return
    }
    if (patch.manualTex === null) {
      delete v.manualTex
      delete v.manualEditedAt
      needsRebuild = true
    } else if (patch.llmPlan) {
      const ev = readSnapshot(id, root)
      assertValidLlmPlan(patch.llmPlan, ev)
      v.llmPlan = patch.llmPlan
      v.accepted = diffPlans(ev, buildBasePlan(ev, patch.llmPlan.profile), patch.llmPlan).map((s) => s.id)
      needsRebuild = true
    } else if (patch.accepted) {
      v.accepted = [...patch.accepted]
      needsRebuild = true
    }
    if (needsRebuild) {
      // The stored measurement belongs to the old plan; clear it so an interrupted compile can't leave
      // canFinalize true for an unmeasured plan.
      v.pageFill = null
      v.layoutWarnings = []
      delete v.compileError
    }
    writeVersion(v, root)
    if (needsRebuild) await rebuildLocked(id, root, deps)
  })
}

export function finalizeVersion(id: string, root = VERSIONS_ROOT): Promise<void> {
  versionDir(id, root)
  return withLock(id, async () => {
    const v = readVersion(id, root)
    if (v.status === 'final') throw new VersionFrozenError(`Version ${id} is already final`)
    const view = readVersionView(id, root)
    if (!view.canFinalize) {
      throw new FinalizeNotAllowedError(
        view.compileError ?? (view.validationErrors.length ? 'Plan has validation errors'
          : view.layoutWarnings.length ? `Layout overflows the page: ${view.layoutWarnings.join('; ')}`
            : 'Page fill exceeds limit or is unknown'),
        view.validationErrors, view.pageFill)
    }
    v.status = 'final'
    v.finalizedAt = new Date().toISOString()
    writeVersion(v, root)
  })
}
