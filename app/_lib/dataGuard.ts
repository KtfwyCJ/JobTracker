/** Below this many existing jobs the guard stays out of the way (fresh installs, test data). */
const MIN_JOBS_TO_GUARD = 10

const jobCount = (d: unknown): number | null => {
  const jobs = (d as { jobs?: unknown } | null)?.jobs
  return Array.isArray(jobs) ? jobs.length : null
}

/**
 * True when writing `incoming` over `existing` would drop more than half of the stored jobs.
 * The UI deletes jobs one at a time, so a shrink like that is a client bug (e.g. a tab that saved
 * before its data finished loading), never a real edit — refuse it rather than wipe data.json.
 */
export function isDestructiveWrite(existing: unknown, incoming: unknown): boolean {
  const before = jobCount(existing)
  if (before === null || before < MIN_JOBS_TO_GUARD) return false
  const after = jobCount(incoming)
  return after === null || after < before / 2
}
