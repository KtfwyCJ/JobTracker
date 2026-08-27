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
  source:
    | 'arbeitnow'
    | 'linkedin'
    | 'indeed'
    | 'adzuna'
    | 'greenhouse'
    | 'ashby'
    | 'lever'
    | 'smartrecruiters'
    | 'personio'
  myPriority: string
  category: string
  industry: string
  companyCity: string
  careerUrl: string | null
}

interface NoCoverageCompany {
  name: string
  myPriority: string
  category: string
  careerUrl: string | null
}

const DEFAULT_KEYWORDS = ['Software Engineer', 'AI Engineer', 'Frontend Engineer', 'Frontend', 'Front End', 'Front-end', 'AI Application Developer', 'AI Developer', 'Machine Learning Engineer', 'ML Engineer', 'Fullstack Engineer', 'Full Stack Engineer', 'Full-stack Engineer', 'Fullstack Developer']

const PRIORITY_GROUPS: { key: string; label: string }[] = [
  { key: 'S+', label: 'S+ — Top priority' },
  { key: 'S', label: 'S — High priority' },
  { key: 'A', label: 'A — Strong fit' },
  { key: 'B', label: 'B — Worth watching' },
  { key: 'other', label: 'Other' },
]

const PRIORITY_ORDER: Record<string, number> = { 'S+': 0, S: 1, A: 2, B: 3 }

function locationMatchesCity(location: string, city: string): boolean {
  const c = city.trim().toLowerCase()
  return !c || location.toLowerCase().includes(c)
}

function groupResults(results: WatchlistResult[]): Record<string, WatchlistResult[]> {
  const buckets: Record<string, WatchlistResult[]> = { 'S+': [], S: [], A: [], B: [], other: [] }
  for (const r of results) {
    const key = buckets[r.myPriority] ? r.myPriority : 'other'
    buckets[key].push(r)
  }
  for (const list of Object.values(buckets)) {
    list.sort((a, b) => {
      const ta = a.postedAt ? new Date(a.postedAt).getTime() : 0
      const tb = b.postedAt ? new Date(b.postedAt).getTime() : 0
      return tb - ta
    })
  }
  return buckets
}

export default function WatchlistExplorer({ onApply }: { onApply: (prefill: ApplyPrefill) => void }) {
  const { data, addWaitlistEntry } = useStore()

  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS)
  const [keywordInput, setKeywordInput] = useState('')
  const [minDate, setMinDate] = useState('')
  const [country, setCountry] = useState('Germany')
  const [city, setCity] = useState('')

  const [results, setResults] = useState<WatchlistResult[]>([])
  const [companiesChecked, setCompaniesChecked] = useState(0)
  const [companiesWithDirectAts, setCompaniesWithDirectAts] = useState(0)
  const [noDirectCoverage, setNoDirectCoverage] = useState<NoCoverageCompany[]>([])
  const [aggregatorStatus, setAggregatorStatus] = useState<Record<string, string> | null>(null)
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
    setAggregatorStatus(null)

    try {
      const res = await fetch('/api/explore/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: effectiveKeywords,
          country,
          city,
          publishedAfter: minDate,
          resolveAts,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Refresh failed')
        return
      }
      setResults(json.results.filter((r: WatchlistResult) => !alreadyTracked(r)))
      setCompaniesChecked(json.companiesChecked)
      setCompaniesWithDirectAts(json.companiesWithDirectAts ?? 0)
      setNoDirectCoverage(json.noDirectCoverage ?? [])
      setAggregatorStatus(json.aggregatorStatus ?? null)
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

  const visibleResults = results.filter((r) => locationMatchesCity(r.location, city))
  const filtersActive = Boolean(city.trim())
  const grouped = groupResults(visibleResults)

  const aggregatorIssues = aggregatorStatus
    ? Object.entries(aggregatorStatus)
        .filter(([, s]) => s !== 'ok')
        .map(([name, s]) => `${name}: ${s === 'no_keys' ? 'no API key' : s.replace(/_/g, ' ')}`)
    : []

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

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Published after</p>
          <input
            type="date"
            value={minDate}
            onChange={(e) => setMinDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
          {minDate && (
            <button
              onClick={() => setMinDate('')}
              className="mt-1 text-[10px] text-zinc-400 underline decoration-dotted hover:text-zinc-600"
            >
              Clear
            </button>
          )}
          <p className="mt-1 text-[10px] text-zinc-400">Blank = last 30 days. Jobs with no detectable date are hidden once a date is set.</p>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Country</p>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Germany"
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            City <span className="text-[10px] font-normal normal-case tracking-normal text-zinc-300">optional</span>
          </p>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Berlin"
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <p className="text-[10px] text-zinc-400">
          Searches every company in your Company directory for these titles — direct from the job board where one is known, otherwise via LinkedIn / Indeed / Adzuna.
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
          <>
            <p className="mb-1 text-xs text-zinc-500">
              Checked {companiesChecked} companies ({companiesWithDirectAts} via direct job board) · {visibleResults.length} new role{visibleResults.length !== 1 ? 's' : ''} found
              {filtersActive && results.length !== visibleResults.length && ` (${results.length} before city filter)`}
            </p>
            {aggregatorIssues.length > 0 && (
              <p className="mb-3 text-[10px] text-zinc-400">Sources — {aggregatorIssues.join(' · ')}</p>
            )}
          </>
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
            <p className="mt-1 text-xs text-zinc-400">Try different keywords, widen the date, or check back later</p>
          </div>
        )}

        {searched && !loading && !error && results.length > 0 && visibleResults.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <p className="text-sm font-medium text-zinc-500">No roles match your city filter</p>
            <p className="mt-1 text-xs text-zinc-400">{results.length} role{results.length !== 1 ? 's' : ''} found overall — try clearing the city</p>
          </div>
        )}

        {!searched && (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <p className="text-sm text-zinc-400">Click Refresh to check your whole company directory</p>
          </div>
        )}

        {(visibleResults.length > 0 || noDirectCoverage.length > 0) && (
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
                        meta={{ priority: result.myPriority, city: result.companyCity, industry: result.industry }}
                      />
                    ))}
                  </div>
                </details>
              )
            })}

            {noDirectCoverage.length > 0 && (
              <details className="group">
                <summary className="mb-2 cursor-pointer text-xs font-bold uppercase tracking-widest text-zinc-400">
                  No visibility ({noDirectCoverage.length})
                </summary>
                <p className="mb-2 text-[11px] text-zinc-400">
                  No known job board detected and nothing matched via LinkedIn / Indeed / Adzuna — this doesn&apos;t mean these companies have no open roles, just that we couldn&apos;t check reliably. Worth a manual look.
                </p>
                <div className="flex flex-col gap-1">
                  {[...noDirectCoverage]
                    .sort((a, b) => (PRIORITY_ORDER[a.myPriority] ?? 99) - (PRIORITY_ORDER[b.myPriority] ?? 99))
                    .map((c) => (
                      <div key={c.name} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-zinc-700">{c.name}</span>
                          <span className="text-[10px] text-zinc-400">{c.myPriority || c.category}</span>
                        </span>
                        {c.careerUrl && (
                          <a
                            href={c.careerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900"
                          >
                            Career Portal ↗
                          </a>
                        )}
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
