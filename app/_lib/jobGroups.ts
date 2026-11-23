import type { Company, Job, JobStatus } from './types'

export interface JobFilters { status: JobStatus | 'all'; star: number | null; search: string }
export interface CompanyGroup { company: Company; jobs: Job[] }

/**
 * Sidebar grouping for JobList: companies with at least one job matching the filters, newest company first
 * (by the latest createdAt across ALL its jobs), each with its matching jobs newest first.
 * One pass over jobs instead of re-filtering every job inside the sort comparator.
 */
export function groupJobsByCompany(companies: Company[], jobs: Job[], f: JobFilters): CompanyGroup[] {
  const q = f.search.toLowerCase()
  const byCompany = new Map<string, Job[]>()
  const latest = new Map<string, string>()
  for (const j of jobs) {
    const list = byCompany.get(j.companyId)
    if (list) list.push(j)
    else byCompany.set(j.companyId, [j])
    if (j.createdAt > (latest.get(j.companyId) ?? '')) latest.set(j.companyId, j.createdAt)
  }
  const matches = (j: Job, companyName: string) => {
    if (f.status !== 'all' && j.status !== f.status) return false
    if (f.star !== null && j.matchLevel !== f.star) return false
    if (!q) return true
    return companyName.toLowerCase().includes(q) || j.title.toLowerCase().includes(q)
  }
  const groups: CompanyGroup[] = []
  for (const company of companies) {
    const matching = (byCompany.get(company.id) ?? []).filter((j) => matches(j, company.name))
    if (matching.length) groups.push({ company, jobs: matching.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
  }
  return groups.sort((a, b) => (latest.get(b.company.id) ?? '').localeCompare(latest.get(a.company.id) ?? ''))
}

// One shared formatter: toLocaleDateString builds a new Intl formatter per call (~28ms for 343 cards).
const APPLIED_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

/** "May 17" for a YYYY-MM-DD date; "Invalid Date" (like toLocaleDateString) instead of throwing on bad input. */
export function formatAppliedDate(appliedAt: string): string {
  const d = new Date(appliedAt + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? 'Invalid Date' : APPLIED_FMT.format(d)
}
