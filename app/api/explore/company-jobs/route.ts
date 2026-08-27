import { COMPANY_DIRECTORY } from '../../../_lib/data/companies'
import {
  keywordClusters,
  fetchLinkedInForCompany,
  fetchIndeedForCompany,
  fetchAdzunaForCompany,
  countryCodeFor,
  type JobPosting,
  type SourceStatus,
} from '../../../_lib/jobSearch'
import { resolveCompanyAts } from '../../../_lib/atsCache'
import { fetchAtsJobs, type AtsMapping } from '../../../_lib/providers'
import {
  deriveAliases,
  matchJobToCompany,
  toAtsInput,
  directoryCity,
} from '../../../_lib/companyDirectory'
import { locationMatchesCountry, locationMatchesCity } from '../../../_lib/location'

interface CompanyJob extends JobPosting {
  myPriority: string
  category: string
  industry: string
  companyCity: string
  careerUrl: string | null
}

const DEFAULT_DAYS = 30
const MAX_DAYS = 60

function daysOldFrom(publishedAfter: string): number {
  if (!publishedAfter) return DEFAULT_DAYS
  const t = Date.parse(`${publishedAfter}T00:00:00`)
  if (Number.isNaN(t)) return DEFAULT_DAYS
  const d = Math.ceil((Date.now() - t) / 86_400_000)
  return d < 1 ? 1 : Math.min(d, MAX_DAYS)
}

function titleMatches(job: JobPosting, patterns: string[]): boolean {
  const t = job.title.toLowerCase()
  return patterns.some((k) => t.includes(k))
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      company?: string
      keywords?: string[]
      country?: string
      city?: string
      publishedAfter?: string
      resolveAts?: boolean
    }

    const companyName = (body.company ?? '').trim()
    const keywords = body.keywords?.map((k) => k.trim()).filter(Boolean) ?? []
    if (keywords.length === 0) {
      return Response.json({ error: 'keywords are required' }, { status: 400 })
    }

    const entry = COMPANY_DIRECTORY.find((c) => c.company === companyName)
    if (!entry) {
      return Response.json({ error: `Unknown company: ${companyName}` }, { status: 404 })
    }

    const country = (body.country ?? 'Germany').trim()
    const city = (body.city ?? '').trim()
    const publishedAfter = (body.publishedAfter ?? '').trim()
    const daysOld = daysOldFrom(publishedAfter)
    const minDateMs =
      publishedAfter && !Number.isNaN(Date.parse(`${publishedAfter}T00:00:00`))
        ? Date.parse(`${publishedAfter}T00:00:00`)
        : null
    const keywordPatterns = keywords.map((k) => k.toLowerCase())
    const countryCode = countryCodeFor(country)
    const location = city || country
    const clusters = keywordClusters(keywords)

    const aliases = deriveAliases(entry.company)
    const queryName = aliases[0] ?? entry.company

    const [linkedInRes, indeedRes, adzunaRes, atsResult] = await Promise.all([
      fetchLinkedInForCompany(queryName, clusters, location, daysOld),
      fetchIndeedForCompany(queryName, clusters, location, countryCode, daysOld),
      fetchAdzunaForCompany(queryName, clusters, city, countryCode, daysOld),
      (async (): Promise<{ jobs: JobPosting[]; status: 'ok' | 'none' | 'error' }> => {
        try {
          const map = await resolveCompanyAts([toAtsInput(entry)], body.resolveAts === true)
          const mapping: AtsMapping | null = map.get(entry.company) ?? null
          if (!mapping) return { jobs: [], status: 'none' }
          const jobs = await fetchAtsJobs(mapping, entry.company)
          return { jobs, status: 'ok' }
        } catch {
          return { jobs: [], status: 'error' }
        }
      })(),
    ])

    const sources: {
      linkedin: SourceStatus
      indeed: SourceStatus
      adzuna: SourceStatus
      ats: 'ok' | 'none' | 'error'
    } = {
      linkedin: linkedInRes.status,
      indeed: indeedRes.status,
      adzuna: adzunaRes.status,
      ats: atsResult.status,
    }

    // ATS jobs first so they win dedupe.
    const merged: JobPosting[] = [
      ...atsResult.jobs,
      ...linkedInRes.jobs,
      ...indeedRes.jobs,
      ...adzunaRes.jobs,
    ]
    const atsJobSet = new Set(atsResult.jobs)

    const seen = new Set<string>()
    const results: CompanyJob[] = []
    for (const job of merged) {
      const fromAts = atsJobSet.has(job)
      if (!fromAts && !matchJobToCompany(job, entry)) continue
      if (!titleMatches(job, keywordPatterns)) continue
      if (minDateMs !== null) {
        if (!job.postedAt) continue
        if (Date.parse(job.postedAt) < minDateMs) continue
      }
      if (!locationMatchesCountry(job.location, country, job.country)) continue
      if (!locationMatchesCity(job.location, city)) continue

      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)

      results.push({
        ...job,
        myPriority: entry.myPriority || '',
        category: entry.category,
        industry: entry.industry,
        companyCity: directoryCity(entry),
        careerUrl: entry.careerUrl,
      })
    }

    results.sort((a, b) => {
      const ta = a.postedAt ? Date.parse(a.postedAt) : 0
      const tb = b.postedAt ? Date.parse(b.postedAt) : 0
      return tb - ta
    })

    return Response.json({ company: entry.company, results, sources, keywordsUsed: keywords })
  } catch (err) {
    console.error('[explore/company-jobs]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
