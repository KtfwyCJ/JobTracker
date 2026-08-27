'use client'

import ResultCard from './ResultCard'
import type { ApplyPrefill } from './types'
import type { CompanyJob, SourceReport } from './CompanyJobExplorer'

interface CacheEntry {
  results: CompanyJob[]
  sources: SourceReport
}

function sourceNote(s: SourceReport): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(s)) {
    if (v === 'ok' || v === 'none') continue
    parts.push(`${k}: ${v === 'no_keys' ? 'no API key' : v.replace(/_/g, ' ')}`)
  }
  return parts.join(' · ')
}

export default function CompanyJobResults({
  mode,
  selected,
  aggregated,
  cache,
  inFlight,
  savedIds,
  alreadyTracked,
  onWaitlist,
  onApply,
  onResearch,
}: {
  mode: 'single' | 'aggregated'
  selected: string | null
  aggregated: string[] | null
  cache: Map<string, CacheEntry>
  inFlight: Set<string>
  savedIds: Set<string>
  alreadyTracked: (j: CompanyJob) => boolean
  onWaitlist: (j: CompanyJob) => void
  onApply: (p: ApplyPrefill) => void
  onResearch: (name: string) => void
}) {
  const renderCards = (jobs: CompanyJob[]) =>
    jobs
      .filter((j) => !alreadyTracked(j))
      .map((j) => (
        <ResultCard
          key={j.id}
          result={j}
          isSaved={savedIds.has(j.id)}
          onWaitlist={() => onWaitlist(j)}
          onMarkApplied={() => onApply({ companyName: j.company, title: j.title, location: j.location, jobLink: j.url })}
          meta={{ priority: j.myPriority, city: j.companyCity, industry: j.industry }}
        />
      ))

  if (mode === 'aggregated' && aggregated) {
    return (
      <main className="flex-1 overflow-y-auto p-4">
        {aggregated.map((name) => {
          const entry = cache.get(name)
          if (!entry) {
            return (
              <p key={name} className="mb-1 text-xs text-zinc-300">
                {name} — {inFlight.has(name) ? 'searching…' : 'queued'}
              </p>
            )
          }
          if (entry.results.length === 0) {
            return <p key={name} className="mb-1 text-xs text-zinc-400">{name} — none</p>
          }
          return (
            <div key={name} className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                {name} ({entry.results.length})
              </p>
              <div className="flex flex-col gap-2">{renderCards(entry.results)}</div>
            </div>
          )
        })}
      </main>
    )
  }

  if (!selected) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-zinc-400">Select a company to search its jobs</p>
      </main>
    )
  }

  const entry = cache.get(selected)
  const busy = inFlight.has(selected)

  return (
    <main className="flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-800">
          {selected}
          {entry ? ` — ${entry.results.length} role${entry.results.length !== 1 ? 's' : ''}` : ''}
        </p>
        {entry && (
          <button
            onClick={() => onResearch(selected)}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            ↻ Re-search
          </button>
        )}
      </div>

      {busy && !entry && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      )}

      {entry && entry.results.length > 0 && (
        <div className="flex flex-col gap-2">{renderCards(entry.results)}</div>
      )}

      {entry && entry.results.length === 0 && (
        <div className="pt-16 text-center">
          <p className="text-sm font-medium text-zinc-500">No roles found for {selected} with these filters.</p>
        </div>
      )}

      {entry && sourceNote(entry.sources) && (
        <p className="mt-3 text-[10px] text-zinc-400">sources — {sourceNote(entry.sources)}</p>
      )}
    </main>
  )
}
