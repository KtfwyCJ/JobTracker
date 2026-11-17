import fs from 'node:fs'
import path from 'node:path'
import type { Evidence, JdAnalysis, LlmPlan, Plan } from './types'
import { parseEvidence } from './evidence'
import { buildBasePlan } from './base'
import { applySuggestions, diffPlans, displayDiff, type Suggestion } from './suggestions'
import { validatePlan } from './validate'
import { renderPlainText, renderTex } from './render'
import { compileTex, MAX_PAGE_FILL } from './compile'
import { computeCoverage, type Coverage } from './coverage'
import { evidenceGaps } from './gaps'

export interface ResumeVersion {
  id: string; createdAt: string; status: 'draft' | 'final'; finalizedAt?: string
  jobUrl?: string; jd: JdAnalysis; jobText?: string; analysis?: string; gapsScore?: number
  llmPlan: LlmPlan; accepted: string[]; pageFill: number | null; compileError?: string
}
export interface VersionView extends ResumeVersion {
  base: Plan; current: Plan; suggestions: Suggestion[]; validationErrors: string[]
  diff: ReturnType<typeof displayDiff>; coverageBase: Coverage; coverageFinal: Coverage
  gaps: ReturnType<typeof evidenceGaps>; canFinalize: boolean
}

export class VersionIdError extends Error {}
export class VersionNotFoundError extends Error {}
export class VersionFrozenError extends Error {}
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

// ---- per-id in-process lock ----
const locks = new Map<string, Promise<unknown>>()
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
  try {
    const r = await (deps?.compile ?? compileTex)(renderTex(ev, current), dir)
    v.pageFill = r.pageFill
    delete v.compileError
  } catch (e) {
    v.pageFill = null
    v.compileError = e instanceof Error ? e.message : String(e)
    fs.rmSync(path.join(dir, 'cv.pdf'), { force: true })
  }
  writeVersion(v, root)
}

export const rebuild = (id: string, root = VERSIONS_ROOT, deps?: VersionDeps) =>
  withLock(id, () => rebuildLocked(id, root, deps))

export async function createVersion(
  input: { jd: JdAnalysis; jobUrl?: string; jobText?: string; analysis?: string; gapsScore?: number; llmPlan: LlmPlan },
  evidenceYaml: string,
  root = VERSIONS_ROOT,
  deps?: VersionDeps,
): Promise<string> {
  const ev = parseEvidence(evidenceYaml)
  const id = makeVersionId(input.jd.company, input.jd.title)
  const dir = versionDir(id, root)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(snapshotPath(id, root), evidenceYaml)
  const base = buildBasePlan(ev, input.llmPlan.profile)
  const { jd, jobUrl, jobText, analysis, gapsScore, llmPlan } = input
  writeVersion({
    id, createdAt: new Date().toISOString(), status: 'draft', jobUrl, jd, jobText, analysis, gapsScore, llmPlan,
    accepted: diffPlans(ev, base, llmPlan).map((s) => s.id), pageFill: null,
  }, root)
  await rebuild(id, root, deps)
  return id
}

export function readVersionView(id: string, root = VERSIONS_ROOT): VersionView {
  const v = readVersion(id, root)
  const ev = readSnapshot(id, root)
  const { base, current, validationErrors } = compute(v, ev)
  const canFinalize = validationErrors.length === 0 && !v.compileError && v.pageFill !== null && v.pageFill <= MAX_PAGE_FILL
  return {
    ...v, base, current, validationErrors, canFinalize,
    suggestions: diffPlans(ev, base, v.llmPlan),
    diff: displayDiff(ev, base, current),
    coverageBase: computeCoverage(v.jd, renderPlainText(ev, base), ev.aliases),
    coverageFinal: computeCoverage(v.jd, renderPlainText(ev, current), ev.aliases),
    gaps: evidenceGaps(v.jd, ev, current),
  }
}

export function updateVersion(
  id: string,
  patch: { accepted?: string[]; analysis?: string; gapsScore?: number; llmPlan?: LlmPlan },
  root = VERSIONS_ROOT,
  deps?: VersionDeps,
): Promise<void> {
  versionDir(id, root)
  return withLock(id, async () => {
    const v = readVersion(id, root)
    if (v.status === 'final') throw new VersionFrozenError(`Version ${id} is final`)
    if (patch.analysis !== undefined) v.analysis = patch.analysis
    if (patch.gapsScore !== undefined) v.gapsScore = patch.gapsScore
    let needsRebuild = false
    if (patch.llmPlan) {
      const ev = readSnapshot(id, root)
      v.llmPlan = patch.llmPlan
      v.accepted = diffPlans(ev, buildBasePlan(ev, patch.llmPlan.profile), patch.llmPlan).map((s) => s.id)
      needsRebuild = true
    } else if (patch.accepted) {
      v.accepted = [...patch.accepted]
      needsRebuild = true
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
        view.compileError ?? (view.validationErrors.length ? 'Plan has validation errors' : 'Page fill exceeds limit or is unknown'),
        view.validationErrors, view.pageFill)
    }
    v.status = 'final'
    v.finalizedAt = new Date().toISOString()
    writeVersion(v, root)
  })
}
