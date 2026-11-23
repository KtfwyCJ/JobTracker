import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatAppliedDate, groupJobsByCompany, type JobFilters } from '../jobGroups'
import type { Company, Job, JobStatus } from '../types'

/** The exact logic JobList.tsx used before the refactor — the oracle the new function must match. */
function legacy(companies: Company[], jobs: Job[], f: JobFilters) {
  const q = f.search.toLowerCase()
  const match = (j: Job, companyName: string) => {
    if (f.status !== 'all' && j.status !== f.status) return false
    if (f.star !== null && j.matchLevel !== f.star) return false
    if (!q) return true
    return companyName.toLowerCase().includes(q) || j.title.toLowerCase().includes(q)
  }
  return companies
    .filter((c) => jobs.some((j) => j.companyId === c.id && match(j, c.name)))
    .sort((a, b) => {
      const la = jobs.filter((j) => j.companyId === a.id).reduce((m, j) => (j.createdAt > m ? j.createdAt : m), '')
      const lb = jobs.filter((j) => j.companyId === b.id).reduce((m, j) => (j.createdAt > m ? j.createdAt : m), '')
      return lb.localeCompare(la)
    })
    .map((company) => ({
      company,
      jobs: jobs.filter((j) => j.companyId === company.id && match(j, company.name)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
}

const ids = (g: ReturnType<typeof legacy>) => g.map((x) => [x.company.id, x.jobs.map((j) => j.id)])

const STATUSES: JobStatus[] = ['applied', 'phone_screen', 'rejected', 'offer']
function fixture(seed: number) {
  let s = seed
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
  const companies: Company[] = Array.from({ length: 40 }, (_, i) => ({ id: `c${i}`, name: `Comp ${i % 7 === 0 ? 'Alpha' : 'Beta'} ${i}`, createdAt: '2026-01-01' }) as Company)
  const jobs: Job[] = Array.from({ length: 150 }, (_, i) => ({
    id: `j${i}`, companyId: `c${Math.floor(rnd() * 45)}`, // some point at missing companies
    title: i % 5 === 0 ? 'Senior Frontend Engineer' : 'Backend Dev',
    status: STATUSES[Math.floor(rnd() * STATUSES.length)],
    matchLevel: rnd() < 0.3 ? undefined : 1 + Math.floor(rnd() * 5),
    createdAt: `2026-0${1 + Math.floor(rnd() * 3)}-1${Math.floor(rnd() * 3)}`, // many ties
  }) as Job)
  return { companies, jobs }
}

const FILTERS: JobFilters[] = [
  { status: 'all', star: null, search: '' },
  { status: 'rejected', star: null, search: '' },
  { status: 'all', star: 5, search: '' },
  { status: 'all', star: null, search: 'ALPHA' },
  { status: 'applied', star: null, search: 'frontend' },
  { status: 'all', star: null, search: 'no-such-thing' },
]

describe('groupJobsByCompany', () => {
  it('matches the legacy JobList grouping, order and filtering', () => {
    for (const seed of [1, 2, 3]) {
      const { companies, jobs } = fixture(seed)
      for (const f of FILTERS) expect(ids(groupJobsByCompany(companies, jobs, f)), JSON.stringify({ seed, f })).toEqual(ids(legacy(companies, jobs, f)))
    }
  })

  it('matches the legacy result on the real data.json when present (read-only)', () => {
    const p = join(process.cwd(), 'data.json')
    if (!existsSync(p)) return
    const d = JSON.parse(readFileSync(p, 'utf8')) as { companies: Company[]; jobs: Job[] }
    for (const f of FILTERS) expect(ids(groupJobsByCompany(d.companies, d.jobs, f))).toEqual(ids(legacy(d.companies, d.jobs, f)))
  })
})

describe('formatAppliedDate', () => {
  it('matches the old toLocaleDateString output', () => {
    for (const d of ['2026-05-17', '2026-01-01', '2026-12-31']) {
      expect(formatAppliedDate(d)).toBe(new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    }
    expect(formatAppliedDate('2026-05-17')).toBe('May 17')
  })
  it('does not throw on a bad date (old code rendered "Invalid Date")', () => {
    expect(formatAppliedDate('')).toBe('Invalid Date')
    expect(formatAppliedDate(undefined as unknown as string)).toBe('Invalid Date')
  })
})
