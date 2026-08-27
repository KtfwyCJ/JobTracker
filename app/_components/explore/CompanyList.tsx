'use client'

import { directoryCity } from '../../_lib/companyDirectory'
import type { CompanyDirectoryEntry } from '../../_lib/data/companies'

interface CacheEntryLike {
  results: unknown[]
}

export default function CompanyList({
  groups,
  cache,
  inFlight,
  selected,
  nameFilter,
  onNameFilter,
  onSelect,
  onSearchTier,
  onCancelTier,
  tierRun,
}: {
  groups: { key: string; label: string; companies: CompanyDirectoryEntry[] }[]
  cache: Map<string, CacheEntryLike>
  inFlight: Set<string>
  selected: string | null
  nameFilter: string
  onNameFilter: (v: string) => void
  onSelect: (name: string) => void
  onSearchTier: (key: string) => void
  onCancelTier: () => void
  tierRun: { tier: string; done: number; total: number } | null
}) {
  const nf = nameFilter.trim().toLowerCase()

  return (
    <div className="flex w-72 flex-shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-2">
        <input
          value={nameFilter}
          onChange={(e) => onNameFilter(e.target.value)}
          placeholder="Filter companies…"
          className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {groups.map((g) => {
          const rows = g.companies.filter((c) => !nf || c.company.toLowerCase().includes(nf))
          if (rows.length === 0) return null
          const running = tierRun?.tier === g.key
          return (
            <details key={g.key} open className="mb-2">
              <summary className="flex cursor-pointer items-center justify-between px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <span>{g.label} ({g.companies.length})</span>
                {running ? (
                  <span className="flex items-center gap-1">
                    <span className="text-[10px] normal-case tracking-normal text-zinc-500">{tierRun!.done}/{tierRun!.total}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); onCancelTier() }}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-200"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.preventDefault(); onSearchTier(g.key) }}
                    disabled={Boolean(tierRun)}
                    className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"
                  >
                    Search {g.key}
                  </button>
                )}
              </summary>
              <div className="mt-1 flex flex-col">
                {rows.map((c) => {
                  const entry = cache.get(c.company)
                  const busy = inFlight.has(c.company)
                  const badge = busy ? '…' : entry ? String(entry.results.length) : '—'
                  const hasResults = Boolean(entry && entry.results.length > 0)
                  return (
                    <button
                      key={c.company}
                      onClick={() => onSelect(c.company)}
                      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                        selected === c.company ? 'border-l-2 border-zinc-900 bg-zinc-100' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-zinc-800">{c.company}</span>
                        <span className="ml-1 text-[10px] text-zinc-400">
                          · {directoryCity(c)}{c.ats ? ` · ${c.ats}` : ''}
                        </span>
                      </span>
                      <span className={`shrink-0 tabular-nums text-[10px] ${hasResults ? 'font-semibold text-zinc-700' : 'text-zinc-400'}`}>
                        {badge}
                      </span>
                    </button>
                  )
                })}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
