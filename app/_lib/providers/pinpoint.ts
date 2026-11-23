import type { JobPosting } from '../jobSearch'
import type { Provider } from './types'

async function fetchJobs(subdomain: string, companyName: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://${subdomain}.pinpointhq.com/postings.json`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(json.data) ? json.data : []).map((j: any): JobPosting => {
      const location = j.location?.name ?? j.location?.city ?? ''
      return {
        id: `pp-${j.id}`,
        title: j.title ?? '',
        company: companyName,
        location,
        remote: j.workplace_type === 'remote' || /remote/i.test(location),
        jobTypes: j.employment_type_text ? [j.employment_type_text] : [],
        tags: [],
        // The public feed carries no posting date.
        postedAt: new Date().toISOString(),
        url: j.url ?? '',
        source: 'pinpoint',
      }
    })
  } catch {
    return []
  }
}

const pinpointProvider: Provider = {
  id: 'pinpoint',
  // Skip Pinpoint's own hosts (app./www.), which appear on every custom-domain careers page.
  detectPattern: /\b(?!(?:app|www)\.)([a-zA-Z0-9-]+)\.pinpointhq\.com/,
  fetchJobs,
}

export default pinpointProvider
