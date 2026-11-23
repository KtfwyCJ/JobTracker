import type { LineDiffHunk } from '@/app/_lib/resume/textdiff'

const STYLE = { same: 'text-zinc-400', add: 'bg-green-50 text-green-800', del: 'bg-red-50 text-red-700' } as const
const MARK = { same: ' ', add: '+', del: '−' } as const

/** Line diff of generated LaTeX → hand-edited LaTeX. */
export default function ManualDiff({ hunks }: { hunks: LineDiffHunk[] }) {
  if (hunks.length === 0) return <p className="text-xs text-zinc-500">无手动改动</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 font-mono text-[11px] leading-5">
      {hunks.map((h, i) => (
        <div key={i}>
          {i > 0 && <div className="border-y border-zinc-100 bg-zinc-50 px-2 text-zinc-400">⋯</div>}
          {h.lines.map((l, j) => (
            <div key={j} className={`whitespace-pre px-2 ${STYLE[l.kind]}`}>
              <span className="mr-2 select-none">{MARK[l.kind]}</span>{l.text || ' '}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
