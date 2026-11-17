import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateVersion, regenerateForProfile } from '../pipeline'
import { readVersionView } from '../versions'
import type { JdAnalysis } from '../types'

const fixture = join(__dirname, '../__fixtures__/evidence.yaml')
const jd: JdAnalysis = { company: 'Acme', title: 'Eng', mustHave: [], plus: [], keywords: [] }
const deps = { compile: async (_t: string, d: string) => ({ pdfPath: join(d, 'cv.pdf'), pageFill: 1 }) }
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
