import type { JobPosting } from '../jobSearch'
import type { Provider } from './types'

async function fetchJobs(board: string, companyName: string): Promise<JobPosting[]> {
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

const greenhouseProvider: Provider = {
  id: 'greenhouse',
  detectPattern: /(?:job-boards|boards)\.greenhouse\.io\/([a-zA-Z0-9_-]+)/,
  fetchJobs,
}

export default greenhouseProvider
