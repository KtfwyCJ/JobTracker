import type { JobPosting } from '../jobSearch'
import type { Provider } from './types'

async function fetchJobs(board: string, companyName: string): Promise<JobPosting[]> {
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

const ashbyProvider: Provider = {
  id: 'ashby',
  detectPattern: /jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/,
  fetchJobs,
}

export default ashbyProvider
