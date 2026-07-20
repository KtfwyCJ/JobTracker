import type { JobPosting } from '../jobSearch'
import type { Provider } from './types'

function extractTag(block: string, tag: string): string {
  return block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.trim() ?? ''
}

async function fetchJobs(subdomain: string, companyName: string): Promise<JobPosting[]> {
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

const personioProvider: Provider = {
  id: 'personio',
  detectPattern: /([a-zA-Z0-9-]+)\.jobs\.personio\.(?:de|com)/,
  fetchJobs,
}

export default personioProvider
