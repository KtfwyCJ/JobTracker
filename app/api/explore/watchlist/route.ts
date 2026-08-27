import { parseCompanyList, type WatchlistCompany } from '../../../_lib/companyList'
import { fetchArbeitnow, fetchLinkedIn, type JobPosting } from '../../../_lib/jobSearch'
import { resolveCompanyAts } from '../../../_lib/atsCache'
import { fetchAtsJobs, type AtsMapping } from '../../../_lib/providers'

export interface WatchlistResult extends JobPosting {
  tier: string
  priority: string | null
  category: string
  companyCity: string
}

const CONCURRENCY = 8

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

function matchesCompany(job: JobPosting, company: WatchlistCompany): boolean {
  const jobCompany = job.company.toLowerCase()
  return company.aliases.some((alias) => jobCompany.includes(alias.toLowerCase()))
}

function titleMatches(job: JobPosting, keywordPatterns: string[]): boolean {
  const title = job.title.toLowerCase()
  return keywordPatterns.some((k) => title.includes(k))
}

function dedupe(jobs: JobPosting[]): JobPosting[] {
  const seen = new Set<string>()
  return jobs.filter((j) => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function attachMeta(jobs: JobPosting[], company: WatchlistCompany): WatchlistResult[] {
  return jobs.map((j) => ({
    ...j,
    tier: company.tier,
    priority: company.priority,
    category: company.category,
    companyCity: company.city,
  }))
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { keywords?: string[]; resolveAts?: boolean }
    const keywords = body.keywords?.map((k) => k.trim()).filter(Boolean) ?? []

    if (keywords.length === 0) {
      return Response.json({ error: 'keywords are required' }, { status: 400 })
    }

    let companies: WatchlistCompany[]
    try {
      companies = parseCompanyList()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return Response.json({ error: `Could not read company list: ${msg}` }, { status: 500 })
    }

    const atsByCompany = await resolveCompanyAts(companies, body.resolveAts === true)
    const keywordPatterns = keywords.map((k) => k.toLowerCase())

    // Companies without a detected ATS fall back to the Arbeitnow + LinkedIn aggregator search.
    const fallbackCompanies = companies.filter((c) => !atsByCompany.get(c.name))
    const arbeitnowJobs = fallbackCompanies.length > 0 ? (await fetchArbeitnow(keywords)).jobs : []
    const titleMatchedArbeitnow = arbeitnowJobs.filter((j) => titleMatches(j, keywordPatterns))

    const perCompany = await mapWithConcurrency(companies, CONCURRENCY, async (company) => {
      const mapping: AtsMapping | null = atsByCompany.get(company.name) ?? null

      if (mapping) {
        const atsJobs = await fetchAtsJobs(mapping, company.name)
        const results = attachMeta(dedupe(atsJobs.filter((j) => titleMatches(j, keywordPatterns))), company)
        return { company, results, hasDirectAts: true }
      }

      const linkedInJobs = (await fetchLinkedIn(keywords, company.city, 30)).jobs
      const titleMatchedLinkedIn = linkedInJobs.filter((j) => titleMatches(j, keywordPatterns))

      const combined = dedupe([
        ...titleMatchedArbeitnow.filter((j) => matchesCompany(j, company)),
        ...titleMatchedLinkedIn.filter((j) => matchesCompany(j, company)),
      ])

      return { company, results: attachMeta(combined, company), hasDirectAts: false }
    })

    // Companies with no direct ATS AND nothing found via the aggregator are ambiguous —
    // it could mean there's truly nothing open, or just that we have no real visibility
    // into that company's listings. Surface them separately instead of silently omitting.
    const noDirectCoverage = perCompany
      .filter((c) => !c.hasDirectAts && c.results.length === 0)
      .map(({ company }) => ({
        name: company.name,
        tier: company.tier,
        priority: company.priority,
        category: company.category,
        careerPortalUrl: company.careerPortalUrl,
      }))

    return Response.json({
      results: perCompany.flatMap((c) => c.results),
      companiesChecked: companies.length,
      companiesWithDirectAts: companies.length - fallbackCompanies.length,
      noDirectCoverage,
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
