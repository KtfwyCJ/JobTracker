import type { JobPosting } from './jobSearch'

export type AtsPlatform = 'greenhouse' | 'ashby' | 'lever' | 'smartrecruiters' | 'personio'

export interface AtsMapping {
  platform: AtsPlatform
  board: string
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const BOARD_PATTERNS: { platform: AtsPlatform; re: RegExp }[] = [
  { platform: 'greenhouse', re: /(?:job-boards|boards)\.greenhouse\.io\/([a-zA-Z0-9_-]+)/ },
  { platform: 'ashby', re: /jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/ },
  { platform: 'lever', re: /jobs\.lever\.co\/([a-zA-Z0-9_-]+)/ },
  { platform: 'smartrecruiters', re: /careers\.smartrecruiters\.com\/([a-zA-Z0-9_-]+)/ },
  { platform: 'personio', re: /([a-zA-Z0-9-]+)\.jobs\.personio\.(?:de|com)/ },
]

function matchBoard(text: string): AtsMapping | null {
  for (const { platform, re } of BOARD_PATTERNS) {
    const m = text.match(re)
    if (m) return { platform, board: m[1] }
  }
  return null
}

/**
 * Detects which ATS (if any) powers a company's career portal — either from the
 * portal URL itself, or from ATS board links embedded in the page it renders to.
 */
export async function detectAts(careerPortalUrl: string): Promise<AtsMapping | null> {
  const fromUrl = matchBoard(careerPortalUrl)
  if (fromUrl) return fromUrl

  try {
    const res = await fetch(careerPortalUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    return matchBoard(html)
  } catch {
    return null
  }
}

// ── Greenhouse ───────────────────────────────────────────────────────────────

export async function fetchGreenhouseJobs(board: string, companyName: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(json.jobs) ? json.jobs : []).map((j: any): JobPosting => ({
      id: `gh-${j.id}`,
      title: j.title ?? '',
      company: companyName,
      location: j.location?.name ?? '',
      remote: /remote/i.test(j.location?.name ?? ''),
      jobTypes: [],
      tags: [],
      postedAt: j.updated_at ?? new Date().toISOString(),
      url: j.absolute_url ?? '',
      source: 'greenhouse',
    }))
  } catch {
    return []
  }
}

// ── Ashby ────────────────────────────────────────────────────────────────────

export async function fetchAshbyJobs(board: string, companyName: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${board}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(json.jobs) ? json.jobs : []).map((j: any): JobPosting => ({
      id: `ab-${j.id}`,
      title: j.title ?? '',
      company: companyName,
      location: j.location ?? j.address?.postalAddress?.addressLocality ?? '',
      remote: !!j.isRemote,
      jobTypes: [],
      tags: [],
      postedAt: j.publishedAt ?? new Date().toISOString(),
      url: j.jobUrl ?? j.applyUrl ?? '',
      source: 'ashby',
    }))
  } catch {
    return []
  }
}

// ── Lever ────────────────────────────────────────────────────────────────────

export async function fetchLeverJobs(board: string, companyName: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(json) ? json : []).map((j: any): JobPosting => ({
      id: `lv-${j.id}`,
      title: j.text ?? '',
      company: companyName,
      location: j.categories?.location ?? '',
      remote: /remote/i.test(j.categories?.location ?? ''),
      jobTypes: j.categories?.commitment ? [j.categories.commitment] : [],
      tags: [],
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
      url: j.hostedUrl ?? '',
      source: 'lever',
    }))
  } catch {
    return []
  }
}

// ── SmartRecruiters ──────────────────────────────────────────────────────────

export async function fetchSmartRecruitersJobs(company: string, companyName: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${company}/postings`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(json.content) ? json.content : []).map((j: any): JobPosting => {
      const location = [j.location?.city, j.location?.country].filter(Boolean).join(', ')
      return {
        id: `sr-${j.id}`,
        title: j.name ?? '',
        company: companyName,
        location,
        remote: !!j.location?.remote,
        jobTypes: [],
        tags: [],
        postedAt: j.releasedDate ?? new Date().toISOString(),
        url: j.applyUrl ?? `https://jobs.smartrecruiters.com/${company}/${j.id}`,
        source: 'smartrecruiters',
      }
    })
  } catch {
    return []
  }
}

// ── Personio (XML feed) ──────────────────────────────────────────────────────

function extractTag(block: string, tag: string): string {
  return block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.trim() ?? ''
}

export async function fetchPersonioJobs(subdomain: string, companyName: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://${subdomain}.jobs.personio.de/xml`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const positions = xml.match(/<position>[\s\S]*?<\/position>/g) ?? []
    return positions.map((block): JobPosting => {
      const id = extractTag(block, 'id')
      const name = extractTag(block, 'name')
      const office = extractTag(block, 'office')
      const createdAt = extractTag(block, 'createdAt')
      return {
        id: `pe-${id || name}`,
        title: name,
        company: companyName,
        location: office,
        remote: /remote/i.test(office),
        jobTypes: [],
        tags: [],
        postedAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
        url: `https://${subdomain}.jobs.personio.de/job/${id}`,
        source: 'personio',
      }
    })
  } catch {
    return []
  }
}

export async function fetchAtsJobs(mapping: AtsMapping, companyName: string): Promise<JobPosting[]> {
  switch (mapping.platform) {
    case 'greenhouse':
      return fetchGreenhouseJobs(mapping.board, companyName)
    case 'ashby':
      return fetchAshbyJobs(mapping.board, companyName)
    case 'lever':
      return fetchLeverJobs(mapping.board, companyName)
    case 'smartrecruiters':
      return fetchSmartRecruitersJobs(mapping.board, companyName)
    case 'personio':
      return fetchPersonioJobs(mapping.board, companyName)
  }
}
