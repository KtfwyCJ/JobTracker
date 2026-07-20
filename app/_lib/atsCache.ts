import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { detectAts, type AtsMapping } from './atsClients'
import type { WatchlistCompany } from './companyList'

const CACHE_PATH = join(process.cwd(), 'company-ats-cache.json')

// `null` = resolved, no ATS detected. Absent key = not yet resolved.
type AtsCache = Record<string, AtsMapping | null>

function loadCache(): AtsCache {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveCache(cache: AtsCache): void {
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
  } catch (err) {
    console.error('[atsCache] Failed to persist company-ats-cache.json:', err)
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Returns each company's ATS mapping (or null if none detected / no portal URL).
 * Companies already present in the on-disk cache are reused as-is unless `force`
 * is set — detection involves fetching each company's career portal page, which
 * is too slow to redo on every Watchlist refresh.
 */
export async function resolveCompanyAts(
  companies: WatchlistCompany[],
  force = false
): Promise<Map<string, AtsMapping | null>> {
  const cache = loadCache()
  const toResolve = companies.filter(
    (c) => c.careerPortalUrl && (force || !(c.name in cache))
  )

  if (toResolve.length > 0) {
    const resolved = await mapWithConcurrency(toResolve, 8, async (c) => {
      const mapping = await detectAts(c.careerPortalUrl!)
      return [c.name, mapping] as const
    })
    for (const [name, mapping] of resolved) cache[name] = mapping
    saveCache(cache)
  }

  return new Map(companies.map((c) => [c.name, cache[c.name] ?? null]))
}
