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
  source:
    | 'arbeitnow'
    | 'linkedin'
    | 'indeed'
    | 'adzuna'
    | 'greenhouse'
    | 'ashby'
    | 'lever'
    | 'smartrecruiters'
    | 'personio'
}

export type SourceStatus = 'ok' | 'no_keys' | 'no_country' | 'blocked' | 'error'
export interface SourceResult {
  jobs: JobPosting[]
  status: SourceStatus
}

// lowercased country name -> Adzuna / Indeed country code
export const COUNTRY_CODES: Record<string, string> = {
  germany: 'de',
  deutschland: 'de',
  austria: 'at',
  switzerland: 'ch',
  'united kingdom': 'gb',
  uk: 'gb',
  england: 'gb',
  'united states': 'us',
  'united states of america': 'us',
  usa: 'us',
  france: 'fr',
  netherlands: 'nl',
  spain: 'es',
  italy: 'it',
  poland: 'pl',
  ireland: 'ie',
  canada: 'ca',
  australia: 'au',
  sweden: 'se',
  portugal: 'pt',
  belgium: 'be',
}

export function countryCodeFor(country: string): string {
  return COUNTRY_CODES[country.trim().toLowerCase()] ?? ''
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Collapses near-identical keywords ("Front End" / "Front-end" / "Frontend")
 * so we don't fire three near-duplicate LinkedIn queries.
 */
function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const kw of keywords) {
    const norm = kw.toLowerCase().replace(/[\s-]+/g, ' ').trim()
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    out.push(kw.trim())
  }
  return out
}

// ── Arbeitnow ────────────────────────────────────────────────────────────────

export async function fetchArbeitnow(keywords: string[]): Promise<SourceResult> {
  try {
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

    const jobs = pages.flatMap((json): JobPosting[] =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Array.isArray(json.data) ? json.data : []).map((job: any): JobPosting => ({
        id: `an-${job.slug ?? Math.random()}`,
        title: job.title ?? '',
        company: job.company_name ?? '',
        location: job.location ?? '',
        remote: job.remote ?? false,
        jobTypes: Array.isArray(job.job_types) ? job.job_types : [],
        tags: (Array.isArray(job.tags) ? job.tags : []).slice(0, 4),
        postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : '',
        url: job.url ?? '',
        source: 'arbeitnow',
      }))
    )
    return { jobs, status: 'ok' }
  } catch {
    return { jobs: [], status: 'error' }
  }
}

// ── LinkedIn guest API ────────────────────────────────────────────────────────

export async function fetchLinkedIn(
  keywords: string[],
  location: string,
  daysOld: number
): Promise<SourceResult> {
  const terms = dedupeKeywords(keywords)
  const tpr = `r${Math.max(1, Math.round(daysOld)) * 86400}`
  let anyOk = false
  let anyResponse = false
  const all: JobPosting[] = []

  const runQuery = async (term: string, start: number) => {
    try {
      const params = new URLSearchParams({
        keywords: term,
        location,
        start: String(start),
        f_TPR: tpr,
      })
      const res = await fetch(
        `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`,
        {
          headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
          signal: AbortSignal.timeout(10000),
        }
      )
      anyResponse = true
      if (!res.ok) return
      const jobs = parseLinkedInHTML(await res.text())
      if (jobs.length) anyOk = true
      all.push(...jobs)
    } catch {
      /* one query failing is fine — other terms may still return */
    }
  }

  const tasks: Array<() => Promise<void>> = []
  for (const term of terms) for (const start of [0, 25]) tasks.push(() => runQuery(term, start))

  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(4, tasks.length) }, async () => {
      while (next < tasks.length) await tasks[next++]()
    })
  )

  const status: SourceStatus = anyOk ? 'ok' : anyResponse ? 'blocked' : 'error'
  return { jobs: all, status }
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
      postedAt: date ? new Date(date).toISOString() : '',
      url,
      source: 'linkedin',
    })
  }
  return jobs
}

// ── Adzuna API ───────────────────────────────────────────────────────────────

export async function fetchAdzuna(
  keywords: string[],
  location: string,
  countryCode: string,
  daysOld: number
): Promise<SourceResult> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return { jobs: [], status: 'no_keys' }
  if (!countryCode) return { jobs: [], status: 'no_country' }

  const perPage = 50
  const maxPages = 5
  const all: JobPosting[] = []

  try {
    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: String(perPage),
        what_or: keywords.join(' '),
        'content-type': 'application/json',
        max_days_old: String(Math.max(1, Math.round(daysOld))),
      })
      if (location.trim()) params.set('where', location.trim())

      const res = await fetch(
        `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?${params}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) {
        return all.length ? { jobs: all, status: 'ok' } : { jobs: [], status: 'error' }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json()
      const rows: unknown[] = Array.isArray(json.results) ? json.results : []
      for (const row of rows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const j = row as any
        const desc: string = j.description ?? ''
        all.push({
          id: `ad-${j.id ?? Math.random()}`,
          title: j.title ?? '',
          company: j.company?.display_name ?? '',
          location: j.location?.display_name ?? '',
          remote: /\bremote\b/i.test(`${j.title ?? ''} ${desc}`),
          jobTypes: j.contract_time ? [String(j.contract_time)] : [],
          tags: j.category?.label ? [String(j.category.label)] : [],
          postedAt: j.created ? new Date(j.created).toISOString() : '',
          url: j.redirect_url ?? '',
          source: 'adzuna',
        })
      }
      if (rows.length < perPage) break
    }
    return { jobs: all, status: 'ok' }
  } catch {
    return all.length ? { jobs: all, status: 'ok' } : { jobs: [], status: 'error' }
  }
}

// ── Indeed (best-effort — usually Cloudflare-protected server-side) ────────────

const RELATIVE_DAYS = /(\d+)\+?\s*day/i

function parseIndeedDate(rel: string): string {
  if (/just posted|today|active/i.test(rel)) return new Date().toISOString()
  const m = rel.match(RELATIVE_DAYS)
  if (m) {
    const d = new Date()
    d.setDate(d.getDate() - Number(m[1]))
    return d.toISOString()
  }
  return ''
}

export async function fetchIndeed(
  keywords: string[],
  location: string,
  countryCode: string,
  daysOld: number
): Promise<SourceResult> {
  const host = countryCode === 'us' || !countryCode ? 'www.indeed.com' : `${countryCode}.indeed.com`
  const q = `(${keywords.map((k) => `"${k}"`).join(' OR ')})`
  const all: JobPosting[] = []
  let sawPage = false

  try {
    for (const start of [0, 10]) {
      const params = new URLSearchParams({
        q,
        l: location.trim(),
        fromage: String(Math.max(1, Math.round(daysOld))),
        sort: 'date',
        start: String(start),
      })
      const res = await fetch(`https://${host}/jobs?${params}`, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return { jobs: all, status: all.length ? 'ok' : 'blocked' }

      const html = await res.text()
      sawPage = true
      const looksBlocked =
        /captcha|cf-challenge|Cloudflare|verify you are a human/i.test(html) &&
        !html.includes('mosaic-provider-jobcards')
      if (looksBlocked && all.length === 0) return { jobs: [], status: 'blocked' }

      all.push(...parseIndeedHTML(html))
    }
    return { jobs: all, status: all.length ? 'ok' : sawPage ? 'blocked' : 'error' }
  } catch {
    return { jobs: all, status: all.length ? 'ok' : 'blocked' }
  }
}

function parseIndeedHTML(html: string): JobPosting[] {
  const jobs: JobPosting[] = []

  const blob =
    html.match(/_initialData\s*=\s*(\{[\s\S]*?\});/)?.[1] ??
    html.match(/"mosaic-provider-jobcards"\s*:\s*(\{[\s\S]*?\})\s*,\s*"/)?.[1]
  if (blob) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = JSON.parse(blob)
      const results: unknown[] =
        data?.metaData?.mosaicProviderJobCardsModel?.results ?? data?.results ?? []
      for (const row of results) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = row as any
        if (!r?.title || !r?.jobkey) continue
        jobs.push({
          id: `in-${r.jobkey}`,
          title: r.title,
          company: r.company ?? r.companyName ?? '',
          location: r.formattedLocation ?? r.jobLocationCity ?? '',
          remote: Boolean(r.remoteLocation) || /\bremote\b/i.test(r.title ?? ''),
          jobTypes: Array.isArray(r.jobTypes) ? r.jobTypes.map(String) : [],
          tags: [],
          postedAt: r.formattedRelativeTime ? parseIndeedDate(String(r.formattedRelativeTime)) : '',
          url: `https://www.indeed.com/viewjob?jk=${r.jobkey}`,
          source: 'indeed',
        })
      }
    } catch {
      /* fall through to regex */
    }
  }
  if (jobs.length) return jobs

  for (const part of html.split(/(?=job_seen_beacon)/).slice(1)) {
    const jk = part.match(/data-jk="([^"]+)"/)?.[1] ?? part.match(/jk=([a-f0-9]+)/)?.[1]
    const title = part
      .match(/class="jcs-JobTitle[^"]*"[^>]*>\s*<span[^>]*>([^<]+)/)?.[1]
      ?.trim()
    const company = part.match(/data-testid="company-name"[^>]*>([^<]+)/)?.[1]?.trim()
    const loc = part.match(/data-testid="text-location"[^>]*>([^<]+)/)?.[1]?.trim()
    const rel = part.match(/data-testid="myJobsStateDate"[^>]*>([^<]+)/)?.[1]?.trim()
    if (!jk || !title) continue
    jobs.push({
      id: `in-${jk}`,
      title,
      company: company ?? '',
      location: loc ?? '',
      remote: /\bremote\b/i.test(title),
      jobTypes: [],
      tags: [],
      postedAt: rel ? parseIndeedDate(rel) : '',
      url: `https://www.indeed.com/viewjob?jk=${jk}`,
      source: 'indeed',
    })
  }
  return jobs
}
