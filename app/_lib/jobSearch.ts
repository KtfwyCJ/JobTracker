export interface JobPosting {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  jobTypes: string[]
  tags: string[]
  postedAt: string
  url: string
  source: 'arbeitnow' | 'linkedin' | 'greenhouse' | 'ashby' | 'lever' | 'smartrecruiters' | 'personio'
}

// ── Arbeitnow ────────────────────────────────────────────────────────────────

export async function fetchArbeitnow(keywords: string[]): Promise<JobPosting[]> {
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

  return pages.flatMap((json): JobPosting[] =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Array.isArray(json.data) ? json.data : []).map((job: any): JobPosting => ({
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

export async function fetchLinkedIn(keywords: string[], location: string): Promise<JobPosting[]> {
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

function parseLinkedInHTML(html: string): JobPosting[] {
  const jobs: JobPosting[] = []
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
