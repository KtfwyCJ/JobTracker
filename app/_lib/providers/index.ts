import type { JobPosting } from '../jobSearch'
import type { AtsMapping, AtsPlatform, Provider } from './types'
import greenhouse from './greenhouse'
import ashby from './ashby'
import lever from './lever'
import smartrecruiters from './smartrecruiters'
import personio from './personio'

export type { AtsMapping, AtsPlatform, Provider }

const PROVIDERS: Provider[] = [greenhouse, ashby, lever, smartrecruiters, personio]

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function matchBoard(text: string): AtsMapping | null {
  // Career pages often embed an ATS link inside a JSON blob (e.g. Next.js's
  // __NEXT_DATA__ or a streamed RSC payload), where "/" is escaped as "\/" —
  // sometimes doubly, if the JSON was itself re-stringified. Strip any run of
  // backslashes immediately before a slash so both cases normalize the same way.
  const normalized = text.replace(/\\+\//g, '/')
  for (const provider of PROVIDERS) {
    const m = normalized.match(provider.detectPattern)
    if (m) return { platform: provider.id, board: m[1] }
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

export async function fetchAtsJobs(mapping: AtsMapping, companyName: string): Promise<JobPosting[]> {
  const provider = PROVIDERS.find((p) => p.id === mapping.platform)
  if (!provider) return []
  return provider.fetchJobs(mapping.board, companyName)
}
