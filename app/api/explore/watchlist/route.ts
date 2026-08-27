import { COMPANY_DIRECTORY, type CompanyDirectoryEntry } from '../../../_lib/data/companies'
import {
  fetchArbeitnow,
  fetchLinkedIn,
  fetchIndeed,
  fetchAdzuna,
  countryCodeFor,
  type JobPosting,
  type SourceStatus,
} from '../../../_lib/jobSearch'
import { resolveCompanyAts } from '../../../_lib/atsCache'
import { fetchAtsJobs, type AtsMapping } from '../../../_lib/providers'
import {
  matchJobToCompany,
  SUPPORTED_ATS,
  toAtsInput,
  directoryCity,
} from '../../../_lib/companyDirectory'
import { locationMatchesCountry } from '../../../_lib/location'

interface WatchlistResult extends JobPosting {
  myPriority: string
  category: string
  industry: string
  companyCity: string
  careerUrl: string | null
}

const CONCURRENCY = 8
const DEFAULT_DAYS = 30
const MAX_DAYS = 60

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function daysOldFrom(publishedAfter: string): number {
  if (!publishedAfter) return DEFAULT_DAYS
  const t = Date.parse(`${publishedAfter}T00:00:00`)
  if (Number.isNaN(t)) return DEFAULT_DAYS
  const diffDays = Math.ceil((Date.now() - t) / 86_400_000)
  if (diffDays < 1) return 1
  return Math.min(diffDays, MAX_DAYS)
}

function locationMatchesCity(location: string, city: string): boolean {
  const c = city.trim().toLowerCase()
  return !c || location.toLowerCase().includes(c)
}

function titleMatches(job: JobPosting, keywordPatterns: string[]): boolean {
  const title = job.title.toLowerCase()
  return keywordPatterns.some((k) => title.includes(k))
}

function dedupe<T extends JobPosting>(jobs: T[]): T[] {
  const seen = new Set<string>()
  return jobs.filter((j) => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function attachMeta(jobs: JobPosting[], entry: CompanyDirectoryEntry): WatchlistResult[] {
  return jobs.map((j) => ({
    ...j,
    myPriority: entry.myPriority || '',
    category: entry.category,
    industry: entry.industry,
    companyCity: directoryCity(entry),
    careerUrl: entry.careerUrl,
  }))
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      keywords?: string[]
      country?: string
      city?: string
      publishedAfter?: string
      resolveAts?: boolean
    }

    const keywords = body.keywords?.map((k) => k.trim()).filter(Boolean) ?? []
    if (keywords.length === 0) {
      return Response.json({ error: 'keywords are required' }, { status: 400 })
    }

    const country = (body.country ?? 'Germany').trim()
    const city = (body.city ?? '').trim()
    const publishedAfter = (body.publishedAfter ?? '').trim()
    const daysOld = daysOldFrom(publishedAfter)
    const minDateMs = publishedAfter ? Date.parse(`${publishedAfter}T00:00:00`) : null
    const keywordPatterns = keywords.map((k) => k.toLowerCase())
    const countryCode = countryCodeFor(country)
    const location = city || country

    const companies = COMPANY_DIRECTORY
    const atsByCompany = await resolveCompanyAts(
      companies.map(toAtsInput),
      body.resolveAts === true
    )

    // Aggregator pool — a handful of queries, run once per Refresh, then matched
    // back to the 200 companies by employer name.
    const [arbeitnowRes, linkedInRes, indeedRes, adzunaRes] = await Promise.all([
      fetchArbeitnow(keywords),
      fetchLinkedIn(keywords, location, daysOld),
      fetchIndeed(keywords, location, countryCode, daysOld),
      fetchAdzuna(keywords, city, countryCode, daysOld),
    ])

    const aggregatorStatus: Record<'arbeitnow' | 'linkedin' | 'indeed' | 'adzuna', SourceStatus> = {
      arbeitnow: arbeitnowRes.status,
      linkedin: linkedInRes.status,
      indeed: indeedRes.status,
      adzuna: adzunaRes.status,
    }

    const pool = [
      ...arbeitnowRes.jobs,
      ...linkedInRes.jobs,
      ...indeedRes.jobs,
      ...adzunaRes.jobs,
    ].filter((j) => titleMatches(j, keywordPatterns))

    const perCompany = await mapWithConcurrency(companies, CONCURRENCY, async (entry) => {
      const mapping: AtsMapping | null = atsByCompany.get(entry.company) ?? null

      let atsJobs: JobPosting[] = []
      if (mapping) {
        try {
          atsJobs = (await fetchAtsJobs(mapping, entry.company)).filter((j) =>
            titleMatches(j, keywordPatterns)
          )
        } catch {
          atsJobs = []
        }
      }

      const aggJobs = pool.filter((j) => matchJobToCompany(j, entry))
      const merged = dedupe<JobPosting>([...atsJobs, ...aggJobs])

      return {
        entry,
        results: attachMeta(merged, entry),
        hasDirectAts: Boolean(mapping),
        atsSupported: Boolean(mapping) || SUPPORTED_ATS.test(entry.ats || ''),
      }
    })

    // Server-side keyword/date/country/city filtering — keyword already applied.
    const filtered = perCompany.map((c) => ({
      ...c,
      results: c.results.filter((j) => {
        if (minDateMs !== null) {
          if (!j.postedAt) return false
          if (Date.parse(j.postedAt) < minDateMs) return false
        }
        if (!locationMatchesCountry(j.location, country, j.country)) return false
        if (!locationMatchesCity(j.location, city)) return false
        return true
      }),
    }))

    const noDirectCoverage = filtered
      .filter((c) => c.results.length === 0)
      .map(({ entry }) => ({
        name: entry.company,
        myPriority: entry.myPriority || '',
        category: entry.category,
        careerUrl: entry.careerUrl,
      }))

    return Response.json({
      results: filtered.flatMap((c) => c.results),
      companiesChecked: companies.length,
      companiesWithDirectAts: filtered.filter((c) => c.hasDirectAts).length,
      noDirectCoverage,
      aggregatorStatus,
      keywordsUsed: keywords,
    })
  } catch (err) {
    console.error('[explore/watchlist]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
