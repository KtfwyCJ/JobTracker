import type { JdAnalysis } from './types'

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Span of the first literal term match. A match counts only when it is not
 * directly preceded or followed by [A-Za-z0-9] (so "Java" does not match
 * inside "JavaScript").
 */
export function findTermSpan(text: string, term: string, caseSensitive: boolean): { start: number; end: number } | null {
  if (!term) return null
  const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegex(term)}(?![A-Za-z0-9])`, caseSensitive ? '' : 'i')
  const m = re.exec(text)
  return m ? { start: m.index, end: m.index + m[0].length } : null
}

export function termOccursIn(text: string, term: string, caseSensitive: boolean): boolean {
  return findTermSpan(text, term, caseSensitive) !== null
}

type Aliases = Record<string, string[]>

/** Equivalence class of a term: itself, its aliases, its canonical(s) and their siblings (case-insensitive). */
function equivalents(term: string, aliases: Aliases): string[] {
  const lc = term.toLowerCase()
  const out = new Set<string>([term])
  for (const [canon, alts] of Object.entries(aliases)) {
    const group = [canon, ...alts]
    if (group.some(g => g.toLowerCase() === lc)) group.forEach(g => out.add(g))
  }
  return [...out]
}

export function termMatches(text: string, term: string, aliases: Aliases): boolean {
  return equivalents(term, aliases).some(t => termOccursIn(text, t, false))
}

export type CoverageItem = { text: string; covered: boolean; matched: string[] }
export type CoverageGroup = { covered: number; total: number; items: CoverageItem[] }
export type Coverage = { mustHave: CoverageGroup; plus: CoverageGroup; keywords: CoverageGroup }

const group = (items: CoverageItem[]): CoverageGroup => ({
  covered: items.filter(i => i.covered).length,
  total: items.length,
  items,
})

export function computeCoverage(jd: JdAnalysis, cvText: string, aliases: Aliases): Coverage {
  const matchedOf = (kws: string[]) => kws.filter(k => termMatches(cvText, k, aliases))
  const reqItems = (reqs: JdAnalysis['mustHave']): CoverageItem[] =>
    reqs.map(r => {
      const matched = matchedOf(r.keywords)
      return { text: r.text, covered: matched.length > 0, matched }
    })
  const seen = new Set<string>()
  const uniq = jd.keywords.filter(k => {
    const lc = k.toLowerCase()
    if (seen.has(lc)) return false
    seen.add(lc)
    return true
  })
  const kwItems = uniq.map(k => {
    const covered = termMatches(cvText, k, aliases)
    return { text: k, covered, matched: covered ? [k] : [] }
  })
  return { mustHave: group(reqItems(jd.mustHave)), plus: group(reqItems(jd.plus)), keywords: group(kwItems) }
}
