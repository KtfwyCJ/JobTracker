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
