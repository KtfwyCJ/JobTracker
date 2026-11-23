export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string }
export type LineDiffHunk = { lines: DiffLine[] }

/** Above this many LCS cells the middle section is reported as one block delete + add. */
const MAX_LCS_CELLS = 4_000_000

/** Full line-by-line edit script: common prefix/suffix stripped, LCS on the middle. */
function editScript(a: string[], b: string[]): DiffLine[] {
  let pre = 0
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++
  let suf = 0
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++
  const am = a.slice(pre, a.length - suf)
  const bm = b.slice(pre, b.length - suf)
  const out: DiffLine[] = a.slice(0, pre).map((text) => ({ kind: 'same', text }))

  const n = am.length, m = bm.length
  if (n * m > MAX_LCS_CELLS) {
    out.push(...am.map((text) => ({ kind: 'del' as const, text })), ...bm.map((text) => ({ kind: 'add' as const, text })))
  } else {
    // dp[i][j] = LCS length of am[i:] and bm[j:]
    const w = m + 1
    const dp = new Int32Array((n + 1) * w)
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = am[i] === bm[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1])
      }
    }
    let i = 0, j = 0
    const dels: DiffLine[] = [], adds: DiffLine[] = []
    const flush = () => { out.push(...dels, ...adds); dels.length = 0; adds.length = 0 }
    while (i < n || j < m) {
      if (i < n && j < m && am[i] === bm[j]) { flush(); out.push({ kind: 'same', text: am[i] }); i++; j++ }
      else if (j < m && (i === n || dp[i * w + j + 1] >= dp[(i + 1) * w + j])) adds.push({ kind: 'add', text: bm[j++] })
      else dels.push({ kind: 'del', text: am[i++] })
    }
    flush()
  }
  out.push(...a.slice(a.length - suf).map((text) => ({ kind: 'same' as const, text })))
  return out
}

/** Line diff of a → b grouped into hunks with `context` unchanged lines around each change. */
export function diffLines(a: string, b: string, context = 2): LineDiffHunk[] {
  const script = editScript(a.split('\n'), b.split('\n'))
  const changed = script.map((l, i) => (l.kind === 'same' ? -1 : i)).filter((i) => i >= 0)
  if (changed.length === 0) return []
  const hunks: LineDiffHunk[] = []
  let start = Math.max(0, changed[0] - context)
  let end = changed[0]
  for (const c of changed.slice(1)) {
    if (c - end - 1 > 2 * context) {
      hunks.push({ lines: script.slice(start, Math.min(script.length, end + context + 1)) })
      start = c - context
    }
    end = c
  }
  hunks.push({ lines: script.slice(start, Math.min(script.length, end + context + 1)) })
  return hunks
}
