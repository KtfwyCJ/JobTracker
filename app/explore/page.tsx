'use client'

import { useState } from 'react'
import DashboardShell from '../_components/DashboardShell'
import AddJobModal from '../_components/AddJobModal'
import SearchExplorer from '../_components/explore/SearchExplorer'
import WatchlistExplorer from '../_components/explore/WatchlistExplorer'
import type { ApplyPrefill } from '../_components/explore/types'

type Mode = 'search' | 'watchlist'

const TABS: { key: Mode; label: string }[] = [
  { key: 'search', label: 'Search' },
  { key: 'watchlist', label: 'Watchlist' },
]

export default function ExplorePage() {
  const [mode, setMode] = useState<Mode>('search')
  const [applyPrefill, setApplyPrefill] = useState<ApplyPrefill | null>(null)

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 gap-1 border-b border-zinc-200 bg-white px-4 pt-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === tab.key
                  ? 'border border-b-0 border-zinc-200 bg-zinc-50 text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === 'search' ? (
          <SearchExplorer onApply={setApplyPrefill} />
        ) : (
          <WatchlistExplorer onApply={setApplyPrefill} />
        )}
      </div>

      {applyPrefill && (
        <AddJobModal prefill={applyPrefill} onClose={() => setApplyPrefill(null)} />
      )}
    </DashboardShell>
  )
}
