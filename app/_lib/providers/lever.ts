import type { JobPosting } from '../jobSearch'
import type { Provider } from './types'

async function fetchJobs(board: string, companyName: string): Promise<JobPosting[]> {
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

const leverProvider: Provider = {
  id: 'lever',
  detectPattern: /jobs\.lever\.co\/([a-zA-Z0-9_-]+)/,
  fetchJobs,
}

export default leverProvider
