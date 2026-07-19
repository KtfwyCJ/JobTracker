'use client'

import { KeyboardEvent, useState } from 'react'
import { useStore } from '../../_lib/store'
import ResultCard from './ResultCard'
import type { ApplyPrefill } from './types'

interface WatchlistResult {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  jobTypes: string[]
  tags: string[]
  postedAt: string
  url: string
  source: 'arbeitnow' | 'linkedin' | 'greenhouse' | 'ashby' | 'lever' | 'smartrecruiters' | 'personio'
  tier: string
  priority: string | null
  category: string
  companyCity: string
}

const DEFAULT_KEYWORDS = ['Software Engineer', 'AI Engineer', 'Backend Engineer']

const PRIORITY_GROUPS: { key: string; label: string }[] = [
  { key: 'P1', label: 'P1 — Dream tier' },
  { key: 'P2', label: 'P2 — Best profile fit' },
  { key: 'P3', label: 'P3 — Fast-growing' },
  { key: 'other', label: 'Other — Broader watchlist' },
]

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2 }

function groupResults(results: WatchlistResult[]): Record<string, WatchlistResult[]> {
  const buckets: Record<string, WatchlistResult[]> = { P1: [], P2: [], P3: [], other: [] }
  for (const r of results) {
    const key = r.priority && buckets[r.priority] ? r.priority : 'other'
    buckets[key].push(r)
  }
  for (const list of Object.values(buckets)) {
    list.sort((a, b) => {
      const tierDiff = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99)
      if (tierDiff !== 0) return tierDiff
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    })
  }
  return buckets
}

export default function WatchlistExplorer({ onApply }: { onApply: (prefill: ApplyPrefill) => void }) {
  const { data, addWaitlistEntry } = useStore()

  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS)
  const [keywordInput, setKeywordInput] = useState('')

  const [results, setResults] = useState<WatchlistResult[]>([])
  const [companiesChecked, setCompaniesChecked] = useState(0)
  const [companiesWithDirectAts, setCompaniesWithDirectAts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) setKeywords((prev) => [...prev, kw])
    setKeywordInput('')
  }

  function handleKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1))
    }
  }

  const pendingKeyword = keywordInput.trim()
  const effectiveKeywords = pendingKeyword && !keywords.includes(pendingKeyword)
    ? [...keywords, pendingKeyword]
    : keywords
  const canRefresh = effectiveKeywords.length > 0 && !loading

  function alreadyTracked(result: WatchlistResult): boolean {
    const key = `${result.company.toLowerCase()}|${result.title.toLowerCase()}`
    const inJobs = data.jobs.some((j) => {
      const company = data.companies.find((c) => c.id === j.companyId)
      return `${(company?.name ?? '').toLowerCase()}|${j.title.toLowerCase()}` === key
    })
    if (inJobs) return true
    return data.waitlist.some(
      (w) => `${w.companyName.toLowerCase()}|${w.jobTitle.toLowerCase()}` === key
    )
  }

  async function handleRefresh(resolveAts = false) {
    if (!canRefresh) return

    if (pendingKeyword && !keywords.includes(pendingKeyword)) {
      setKeywords(effectiveKeywords)
      setKeywordInput('')
    }

    setLoading(true)
    setError('')
    setResults([])
    setSearched(true)
    setSavedIds(new Set())

    try {
      const res = await fetch('/api/explore/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: effectiveKeywords, resolveAts }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Refresh failed')
        return
      }
      setResults(json.results.filter((r: WatchlistResult) => !alreadyTracked(r)))
      setCompaniesChecked(json.companiesChecked)
      setCompaniesWithDirectAts(json.companiesWithDirectAts ?? 0)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleWaitlist(result: WatchlistResult) {
    addWaitlistEntry({ companyName: result.company, jobTitle: result.title, jobLink: result.url })
    setSavedIds((prev) => new Set([...prev, result.id]))
  }

  const grouped = groupResults(results)

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col gap-5 border-r border-zinc-200 bg-zinc-50 p-4">

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Keywords</p>
          <div
            className="flex min-h-[40px] cursor-text flex-wrap gap-1.5 rounded-lg border border-zinc-300 bg-white p-1.5 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200"
            onClick={() => document.getElementById('watchlist-keyword-input')?.focus()}
          >
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 rounded bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                {kw}
                <button
                  onClick={(e) => { e.stopPropagation(); setKeywords((prev) => prev.filter((k) => k !== kw)) }}
                  className="leading-none opacity-60 hover:opacity-100"
                >×</button>
              </span>
            ))}
            <input
              id="watchlist-keyword-input"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder={keywords.length === 0 ? 'Add keyword…' : ''}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400"
            />
          </div>
          <p className="mt-1 text-[10px] text-zinc-400">Press Enter to add</p>
        </div>

        <p className="text-[10px] text-zinc-400">
          Searches every company in your <code className="rounded bg-zinc-100 px-1">companylist.md</code> Master Tracker for these titles — direct from each company&apos;s job board where one is known, otherwise via aggregator search.
        </p>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => handleRefresh()}
            disabled={!canRefresh}
            className="rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Checking companies…' : 'Refresh'}
          </button>
          <button
            onClick={() => handleRefresh(true)}
            disabled={!canRefresh}
            className="text-[10px] text-zinc-400 underline decoration-dotted transition-colors hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Re-detect company job boards
          </button>
        </div>
      </aside>

      {/* Results */}
      <main className="flex-1 overflow-y-auto p-4">

        {searched && !loading && !error && (
          <p className="mb-3 text-xs text-zinc-500">
            Checked {companiesChecked} companies ({companiesWithDirectAts} via direct job board) · {results.length} new role{results.length !== 1 ? 's' : ''} found
          </p>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {searched && !loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <p className="text-sm font-medium text-zinc-500">No new roles found</p>
            <p className="mt-1 text-xs text-zinc-400">Try different keywords, or check back later</p>
          </div>
        )}

        {!searched && (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <p className="text-sm text-zinc-400">Click Refresh to check your whole company list</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-4">
            {PRIORITY_GROUPS.map(({ key, label }) => {
              const group = grouped[key]
              if (!group || group.length === 0) return null
              return (
                <details key={key} open className="group">
                  <summary className="mb-2 cursor-pointer text-xs font-bold uppercase tracking-widest text-zinc-400">
                    {label} ({group.length})
                  </summary>
                  <div className="flex flex-col gap-2">
                    {group.map((result) => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        isSaved={savedIds.has(result.id)}
                        onWaitlist={() => handleWaitlist(result)}
                        onMarkApplied={() => onApply({ companyName: result.company, title: result.title, location: result.location, jobLink: result.url })}
                        meta={{ tier: result.tier, priority: result.priority, city: result.companyCity }}
                      />
                    ))}
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
