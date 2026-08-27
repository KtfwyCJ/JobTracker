import type { JobPosting } from './jobSearch'
import type { CompanyDirectoryEntry } from './data/companies'

const LEGAL_SUFFIX =
  /\b(gmbh|se|ag|inc|ltd|llc|plc|n\.?v\.?|s\.?a\.?|co\.?|kg|kgaa|corp|holding|group)\b/gi

/**
 * "Amazon / AWS" -> ["amazon", "aws"]. Splits on "/", strips legal suffixes and
 * punctuation, lowercases. Used to match a free-text employer name on an
 * aggregator job back to a directory company.
 */
export function deriveAliases(company: string): string[] {
  return company
    .split('/')
    .map((part) =>
      part
        .replace(LEGAL_SUFFIX, '')
        .replace(/[.,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    )
    .filter((a) => a.length > 1)
}

export function matchJobToCompany(job: JobPosting, entry: CompanyDirectoryEntry): boolean {
  const jobCompany = job.company.toLowerCase()
  if (!jobCompany) return false
  return deriveAliases(entry.company).some((alias) => jobCompany.includes(alias))
}

/** ATS platforms the provider registry can pull jobs from directly. */
export const SUPPORTED_ATS = /greenhouse|lever|ashby|smart\s*recruiters|personio/i

export function toAtsInput(
  entry: CompanyDirectoryEntry
): { name: string; careerPortalUrl: string | null } {
  return { name: entry.company, careerPortalUrl: entry.careerUrl }
}

/** First office listed for a company, used for the city filter + card meta. */
export function directoryCity(entry: CompanyDirectoryEntry): string {
  const raw = entry.mainGermanyOffices || entry.hq || ''
  return raw.split(/[;/]/)[0]?.trim() ?? ''
}
