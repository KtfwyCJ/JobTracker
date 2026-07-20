import type { JobPosting } from '../jobSearch'
import type { Provider } from './types'

async function fetchJobs(board: string, companyName: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${board}/postings`, {
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
        url: j.applyUrl ?? `https://jobs.smartrecruiters.com/${board}/${j.id}`,
        source: 'smartrecruiters',
      }
    })
  } catch {
    return []
  }
}

const smartRecruitersProvider: Provider = {
  id: 'smartrecruiters',
  detectPattern: /careers\.smartrecruiters\.com\/([a-zA-Z0-9_-]+)/,
  fetchJobs,
}

export default smartRecruitersProvider
