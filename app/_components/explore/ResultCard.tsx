'use client'

import type { JobPosting } from '../../_lib/jobSearch'

const SOURCE_BADGE: Record<string, string> = {
  linkedin: 'bg-blue-100 text-blue-700',
  arbeitnow: 'bg-zinc-100 text-zinc-500',
  greenhouse: 'bg-emerald-100 text-emerald-700',
  ashby: 'bg-fuchsia-100 text-fuchsia-700',
  lever: 'bg-orange-100 text-orange-700',
  smartrecruiters: 'bg-sky-100 text-sky-700',
  personio: 'bg-rose-100 text-rose-700',
}

const TIER_BADGE: Record<string, string> = {
  S: 'bg-amber-100 text-amber-700',
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-zinc-100 text-zinc-500',
}

function relativeTime(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export interface ResultCardMeta {
  tier: string
  priority: string | null
  city: string
}

export default function ResultCard({
  result,
  isSaved,
  onWaitlist,
  onMarkApplied,
  meta,
}: {
  result: JobPosting
  isSaved: boolean
  onWaitlist: () => void
  onMarkApplied: () => void
  meta?: ResultCardMeta
}) {
  return (
    <div
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => window.open(result.url, '_blank')}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">{result.title}</span>
          {meta && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TIER_BADGE[meta.tier] ?? 'bg-zinc-100 text-zinc-500'}`}>
              {meta.tier}{meta.priority ? ` · ${meta.priority}` : ''}
            </span>
          )}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${SOURCE_BADGE[result.source] ?? 'bg-zinc-100 text-zinc-500'}`}>
            {result.source}
          </span>
          {result.remote && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700">Remote</span>
          )}
          {result.jobTypes.map((t) => (
            <span key={t} className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-100 text-zinc-500 capitalize">{t}</span>
          ))}
        </div>
        <p className="text-xs text-zinc-500">{result.company} · {result.location}</p>
        {result.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {result.tags.map((tag) => (
              <span key={tag} className="rounded bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-500">{tag}</span>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-zinc-400">{relativeTime(result.postedAt)}</p>
      </div>
      <div className="flex shrink-0 gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onWaitlist}
          disabled={isSaved}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            isSaved
              ? 'cursor-default border-green-200 bg-green-50 text-green-600'
              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          {isSaved ? 'Saved ✓' : '+ Waitlist'}
        </button>
        <button
          onClick={onMarkApplied}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Mark Applied
        </button>
      </div>
    </div>
  )
}
