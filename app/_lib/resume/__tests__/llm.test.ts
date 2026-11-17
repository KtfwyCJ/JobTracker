import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { planResume, structureJd, buildPlanSchema, LlmError, MAX_BULLETS } from '../llm'

const ev = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))
const jd = { mustHave: [], plus: [], keywords: ['React'] }

const good = () => ({
  profile: 'senior-fullstack',
  profileReason: 'fits',
  fit: 'good',
  experiences: [
    { experienceId: 'acme', bulletIds: ['acme-1', 'acme-2'] },
    { experienceId: 'beta', bulletIds: ['beta-1', 'beta-3'] },
  ],
  bold: [{ bulletId: 'acme-1', terms: ['Node.js'] }],
  skillGroups: [
    { groupId: 'fe', items: ['Vue.js', 'React'] },
    { groupId: 'lang', items: ['Python', 'TypeScript', 'C++'] },
  ],
})
const bad = () => ({ ...good(), profile: 'nope' })
const args = { jd, ev, maxBullets: MAX_BULLETS }

describe('planResume', () => {
  it('valid first answer: one call', async () => {
    const call = vi.fn().mockResolvedValue(good())
    const r = await planResume(args, call)
    expect(r.ok).toBe(true)
    expect(call).toHaveBeenCalledTimes(1)
    expect(call.mock.calls[0][0].effort).toBe('medium')
  })

  it('invalid then valid: retries with errors in user', async () => {
    const call = vi.fn().mockResolvedValueOnce(bad()).mockResolvedValueOnce(good())
    const r = await planResume(args, call)
    expect(r.ok).toBe(true)
    expect(call).toHaveBeenCalledTimes(2)
    const first = (await import('../validate')).validatePlan(bad(), ev, { requireLlmFields: true })
    const firstErr = first.ok ? '' : first.errors[0]
    expect(firstErr).not.toBe('')
    expect(call.mock.calls[1][0].user).toContain(firstErr)
    expect(call.mock.calls[1][0].user).toContain('Your previous answer was rejected:')
  })

  it('invalid twice: ok false', async () => {
    const call = vi.fn().mockResolvedValue(bad())
    const r = await planResume(args, call)
    expect(r.ok).toBe(false)
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('LlmError then valid: ok', async () => {
    const call = vi.fn().mockRejectedValueOnce(new LlmError('refused')).mockResolvedValueOnce(good())
    const r = await planResume(args, call)
    expect(r.ok).toBe(true)
    expect(call.mock.calls[1][0].user).toContain('refused')
  })

  it('forced profile narrows schema enum', () => {
    const s = buildPlanSchema(ev, 'senior-frontend') as {
      additionalProperties: boolean
      properties: { profile: { enum: string[] } }
    }
    expect(s.properties.profile.enum).toEqual(['senior-frontend'])
    expect(s.additionalProperties).toBe(false)
  })
})

describe('structureJd', () => {
  it('defaults missing arrays', async () => {
    const call = vi.fn().mockResolvedValue({ title: 'X' })
    const r = await structureJd('some jd', call)
    expect(r.mustHave).toEqual([])
    expect(r.plus).toEqual([])
    expect(r.keywords).toEqual([])
    expect(call.mock.calls[0][0].effort).toBe('low')
    expect(call.mock.calls[0][0].user).toContain('some jd')
  })
})
