import fs from 'node:fs'
import path from 'node:path'
import type { JdAnalysis, ProfileId } from './types'
import { parseEvidence } from './evidence'
import { MAX_BULLETS, planResume, type CallModel } from './llm'
import { validatePlan } from './validate'
import {
  createVersion, ManualModeError, readVersionRecord, updateVersion, versionDir, VersionFrozenError, type VersionDeps,
} from './versions'

export type PipelineOpts = { evidencePath?: string; root?: string; call?: CallModel; deps?: VersionDeps }

const snapshotFile = (id: string, opts: PipelineOpts) => path.join(versionDir(id, opts.root), 'evidence.snapshot.yaml')
const readEvidenceYaml = (opts: PipelineOpts) => fs.readFileSync(opts.evidencePath ?? 'evidence/cv.yaml', 'utf8')

export async function generateVersion(
  input: { jd: JdAnalysis; jobUrl?: string; jobText?: string; analysis?: string; gapsScore?: number },
  opts: PipelineOpts = {},
): Promise<{ ok: true; id: string } | { ok: false; errors: string[] }> {
  const yamlText = readEvidenceYaml(opts)
  const ev = parseEvidence(yamlText)
  const r = await planResume({ jd: input.jd, ev, maxBullets: MAX_BULLETS }, opts.call)
  if (!r.ok) return { ok: false, errors: r.errors }
  const id = await createVersion({ ...input, llmPlan: r.plan }, yamlText, opts.root, opts.deps)
  return { ok: true, id }
}

export async function regenerateForProfile(
  id: string, profile: ProfileId, opts: PipelineOpts = {},
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const v = readVersionRecord(id, opts.root) // validates id, throws VersionNotFoundError
  if (v.status === 'final') throw new VersionFrozenError(`Version ${id} is final`)
  if (v.manualTex !== undefined) throw new ManualModeError()
  const ev = parseEvidence(fs.readFileSync(snapshotFile(id, opts), 'utf8'))
  const r = await planResume({ jd: v.jd, ev, profile, maxBullets: MAX_BULLETS }, opts.call)
  if (!r.ok) return { ok: false, errors: r.errors }
  if (r.plan.profile !== profile) return { ok: false, errors: [`Model returned profile ${r.plan.profile}, expected ${profile}`] }
  await updateVersion(id, { llmPlan: r.plan }, opts.root, opts.deps)
  return { ok: true }
}

/**
 * Copy a version into a NEW draft over the CURRENT evidence (fresh snapshot), keeping its plan and
 * accepted suggestions. Only if the stored plan no longer validates against the current evidence is the
 * LLM asked for a new plan (`regenerated: true`).
 */
// Hand-edited LaTeX is carried over too, unless the plan had to be regenerated (`manualDropped: true`):
// the edits were made on top of the old plan's output.
export async function duplicateVersion(
  id: string, opts: PipelineOpts = {},
): Promise<{ ok: true; id: string; regenerated: boolean; manualDropped: boolean } | { ok: false; errors: string[] }> {
  const v = readVersionRecord(id, opts.root)
  const yamlText = readEvidenceYaml(opts)
  const ev = parseEvidence(yamlText)
  const { jd, jobUrl, jobText, analysis, gapsScore, llmPlan, accepted, manualTex } = v
  if (!validatePlan(llmPlan, ev, { requireLlmFields: true }).ok) {
    const r = await generateVersion({ jd, jobUrl, jobText, analysis, gapsScore }, opts)
    return r.ok ? { ok: true, id: r.id, regenerated: true, manualDropped: manualTex !== undefined } : r
  }
  const newId = await createVersion(
    { jd, jobUrl, jobText, analysis, gapsScore, llmPlan, accepted, manualTex }, yamlText, opts.root, opts.deps)
  return { ok: true, id: newId, regenerated: false, manualDropped: false }
}
