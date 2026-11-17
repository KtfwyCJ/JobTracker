import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { duplicateVersion, generateVersion, regenerateForProfile } from '../pipeline'
import { finalizeVersion, readVersionView, updateVersion, VersionFrozenError } from '../versions'
import type { JdAnalysis } from '../types'

const fixture = join(__dirname, '../__fixtures__/evidence.yaml')
const jd: JdAnalysis = { company: 'Acme', title: 'Eng', mustHave: [], plus: [], keywords: [] }
const deps = { compile: async (_t: string, d: string) => ({ pdfPath: join(d, 'cv.pdf'), pageFill: 1, warnings: [] }) }
const planFor = (profile: string) => ({
  profile, profileReason: 'r', fit: 'good',
  experiences: [{ experienceId: 'acme', bulletIds: ['acme-1'] }, { experienceId: 'beta', bulletIds: ['beta-2'] }], bold: [],
  skillGroups: [{ groupId: 'lang', items: ['C++', 'Python', 'TypeScript'] }, { groupId: 'fe', items: ['React', 'Vue.js'] }],
})

describe('pipeline', () => {
  it('generates and regenerates', async () => {
    const root = mkdtempSync(join(tmpdir(), 'pl-'))
    try {
      const call = async () => planFor('senior-fullstack')
      const r = await generateVersion({ jd }, { evidencePath: fixture, root, call, deps })
      expect(r.ok ? [] : r.errors).toEqual([])
      if (!r.ok) return
      expect(readVersionView(r.id, root).llmPlan.profile).toBe('senior-fullstack')
      // model ignores forced profile -> rejected
      const bad = await regenerateForProfile(r.id, 'senior-frontend', { root, call, deps })
      expect(bad.ok).toBe(false)
      const ok = await regenerateForProfile(r.id, 'senior-fullstack', { root, call, deps })
      expect(ok.ok).toBe(true)
      // failure
      const f = await generateVersion({ jd }, { evidencePath: fixture, root, call: async () => ({ nope: 1 }), deps })
      expect(f.ok).toBe(false)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})

describe('pipeline: frozen + duplicate', () => {
  const setup = async () => {
    const root = mkdtempSync(join(tmpdir(), 'pl-'))
    const evidencePath = join(root, 'cv.yaml')
    writeFileSync(evidencePath, readFileSync(fixture, 'utf8'))
    const r = await generateVersion({ jd, jobUrl: 'https://j', jobText: 'JD', analysis: 'A', gapsScore: 6 },
      { evidencePath, root, call: async () => planFor('senior-fullstack'), deps })
    if (!r.ok) throw new Error(r.errors.join())
    return { root, evidencePath, id: r.id }
  }

  it('regenerateForProfile on a final version throws before calling the LLM', async () => {
    const { root, evidencePath, id } = await setup()
    try {
      await finalizeVersion(id, root)
      const call = vi.fn()
      await expect(regenerateForProfile(id, 'senior-fullstack', { evidencePath, root, call, deps })).rejects.toBeInstanceOf(VersionFrozenError)
      expect(call).not.toHaveBeenCalled()
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('duplicate copies plan + accepted over current evidence without calling the LLM', async () => {
    const { root, evidencePath, id } = await setup()
    try {
      const src = readVersionView(id, root)
      const keep = src.accepted.slice(0, 1)
      await updateVersion(id, { accepted: keep }, root, deps)
      await finalizeVersion(id, root)
      // evidence changed in a way the plan survives (bullet text edited)
      const changed = readFileSync(evidencePath, 'utf8').replace('Built a ', 'Built a new ')
      writeFileSync(evidencePath, changed)
      const call = vi.fn()
      const d = await duplicateVersion(id, { evidencePath, root, call, deps })
      expect(call).not.toHaveBeenCalled()
      expect(d.ok && d.regenerated).toBe(false)
      if (!d.ok) return
      expect(d.id).not.toBe(id)
      const v = readVersionView(d.id, root)
      expect(v.status).toBe('draft')
      expect(v.llmPlan).toEqual(src.llmPlan)
      expect(v.accepted).toEqual(keep)
      expect([v.jobUrl, v.jobText, v.analysis, v.gapsScore]).toEqual(['https://j', 'JD', 'A', 6])
      expect(readFileSync(join(root, d.id, 'evidence.snapshot.yaml'), 'utf8')).toBe(changed)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('duplicate falls back to the LLM when the old plan no longer validates', async () => {
    const { root, evidencePath, id } = await setup()
    try {
      // remove bullet beta-2 (used by the plan) from the current evidence
      const y = readFileSync(evidencePath, 'utf8').replace(/id: beta-2\n/, 'id: beta-2x\n')
      writeFileSync(evidencePath, y)
      const call = vi.fn().mockResolvedValue({ ...planFor('senior-fullstack'),
        experiences: [{ experienceId: 'acme', bulletIds: ['acme-1'] }, { experienceId: 'beta', bulletIds: ['beta-1'] }] })
      const d = await duplicateVersion(id, { evidencePath, root, call, deps })
      expect(call).toHaveBeenCalledTimes(1)
      expect(d.ok && d.regenerated).toBe(true)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
