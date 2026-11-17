const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Literal term match. A match counts only when it is not directly preceded
 * or followed by [A-Za-z0-9] (so "Java" does not match inside "JavaScript").
 */
export function termOccursIn(text: string, term: string, caseSensitive: boolean): boolean {
  if (!term) return false
  const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegex(term)}(?![A-Za-z0-9])`, caseSensitive ? '' : 'i')
  return re.test(text)
}
