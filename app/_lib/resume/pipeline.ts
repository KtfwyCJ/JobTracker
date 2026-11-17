import fs from 'node:fs'
import type { JdAnalysis, ProfileId } from './types'
import { parseEvidence } from './evidence'
import { MAX_BULLETS, planResume, type CallModel } from './llm'
import { createVersion, updateVersion, versionDir, VersionNotFoundError, type VersionDeps } from './versions'
import path from 'node:path'

export type PipelineOpts = { evidencePath?: string; root?: string; call?: CallModel; deps?: VersionDeps }

export async function generateVersion(
  input: { jd: JdAnalysis; jobUrl?: string; jobText?: string; analysis?: string; gapsScore?: number },
  opts: PipelineOpts = {},
): Promise<{ ok: true; id: string } | { ok: false; errors: string[] }> {
  const yamlText = fs.readFileSync(opts.evidencePath ?? 'evidence/cv.yaml', 'utf8')
  const ev = parseEvidence(yamlText)
  const r = await planResume({ jd: input.jd, ev, maxBullets: MAX_BULLETS }, opts.call)
  if (!r.ok) return { ok: false, errors: r.errors }
  const id = await createVersion({ ...input, llmPlan: r.plan }, yamlText, opts.root, opts.deps)
  return { ok: true, id }
}

export async function regenerateForProfile(
  id: string, profile: ProfileId, opts: PipelineOpts = {},
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const snap = path.join(versionDir(id, opts.root), 'evidence.snapshot.yaml')
  if (!fs.existsSync(snap)) throw new VersionNotFoundError(`Version not found: ${id}`)
  const ev = parseEvidence(fs.readFileSync(snap, 'utf8'))
  const jd = JSON.parse(fs.readFileSync(path.join(versionDir(id, opts.root), 'version.json'), 'utf8')).jd as JdAnalysis
  const r = await planResume({ jd, ev, profile, maxBullets: MAX_BULLETS }, opts.call)
  if (!r.ok) return { ok: false, errors: r.errors }
  if (r.plan.profile !== profile) return { ok: false, errors: [`Model returned profile ${r.plan.profile}, expected ${profile}`] }
  await updateVersion(id, { llmPlan: r.plan }, opts.root, opts.deps)
  return { ok: true }
}
