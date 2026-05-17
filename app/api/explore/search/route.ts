interface Job {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  jobTypes: string[]
  tags: string[]
  postedAt: string
  url: string
  source: string
}

// ── Arbeitnow ────────────────────────────────────────────────────────────────

async function fetchArbeitnow(keywords: string[]): Promise<Job[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) => {
      const params = new URLSearchParams({ search: keywords.join(' '), page: String(page) })
      return fetch(`https://www.arbeitnow.com/api/job-board-api?${params}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .catch(() => ({ data: [] }))
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pages.flatMap((json): Job[] =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Array.isArray(json.data) ? json.data : []).map((job: any): Job => ({
      id: `an-${job.slug ?? Math.random()}`,
      title: job.title ?? '',
      company: job.company_name ?? '',
      location: job.location ?? '',
      remote: job.remote ?? false,
      jobTypes: Array.isArray(job.job_types) ? job.job_types : [],
      tags: (Array.isArray(job.tags) ? job.tags : []).slice(0, 4),
      postedAt: job.created_at
        ? new Date(job.created_at * 1000).toISOString()
        : new Date().toISOString(),
      url: job.url ?? '',
      source: 'arbeitnow',
    }))
  )
}

// ── LinkedIn guest API ────────────────────────────────────────────────────────

async function fetchLinkedIn(keywords: string[], location: string): Promise<Job[]> {
  try {
    const params = new URLSearchParams({
      keywords: keywords.join(' '),
      location,
      start: '0',
    })
    const res = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return []
    return parseLinkedInHTML(await res.text())
  } catch {
    return []
  }
}

function parseLinkedInHTML(html: string): Job[] {
  const jobs: Job[] = []
  for (const part of html.split(/(?=<li\b)/)) {
    const id = part.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/)?.[1]
    const url = part.match(/href="(https:\/\/[^"]*\/jobs\/view\/[^"?]+)/)?.[1]
    const title = part
      .match(/class="[^"]*base-search-card__title[^"]*"[^>]*>\s*([^<\n]+)/)?.[1]
      ?.trim()
    const company = part
      .match(/class="[^"]*base-search-card__subtitle[^"]*"[\s\S]{0,300}?>\s*([^<\n]+)/)?.[1]
      ?.trim()
    const location = part
      .match(/class="[^"]*job-search-card__location[^"]*"[^>]*>\s*([^<\n]+)/)?.[1]
      ?.trim()
    const date = part.match(/datetime="([^"]+)"/)?.[1]

    if (!title || !url) continue

    jobs.push({
      id: id ? `li-${id}` : `li-${Date.now()}-${Math.random()}`,
      title,
      company: company ?? '',
      location: location ?? '',
      remote: false,
      jobTypes: [],
      tags: [],
      postedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      url,
      source: 'linkedin',
    })
  }
  return jobs
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      keywords?: string[]
      location?: string
      company?: string
    }

    const { keywords, location, company } = body

    if (!keywords?.length || !location?.trim()) {
      return Response.json({ error: 'keywords and location are required' }, { status: 400 })
    }

    const [arbeitnowJobs, linkedInJobs] = await Promise.all([
      fetchArbeitnow(keywords),
      fetchLinkedIn(keywords, location.trim()),
    ])

    let jobs = [...arbeitnowJobs, ...linkedInJobs]

    // Keep only jobs whose title contains at least one keyword
    const keywordPatterns = keywords.map((k) => k.toLowerCase())
    jobs = jobs.filter((j) =>
      keywordPatterns.some((k) => j.title.toLowerCase().includes(k))
    )

    // Filter by location — match any word from the input against the job's location
    const locationWords = location.trim().toLowerCase().split(/[\s,]+/).filter(Boolean)
    jobs = jobs.filter((j) => {
      const jobLoc = j.location.toLowerCase()
      return locationWords.some((w) => jobLoc.includes(w))
    })

    // Filter by company if provided
    if (company?.trim()) {
      const needle = company.trim().toLowerCase()
      jobs = jobs.filter((j) => j.company.toLowerCase().includes(needle))
    }

    // Deduplicate by title + company
    const seen = new Set<string>()
    jobs = jobs.filter((j) => {
      const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return Response.json({ results: jobs })
  } catch (err) {
    console.error('[explore/search]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
