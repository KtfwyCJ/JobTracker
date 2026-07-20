'use client'

import { KeyboardEvent, useState } from 'react'
import { useStore } from '../../_lib/store'
import type { JobPosting } from '../../_lib/jobSearch'
import ResultCard from './ResultCard'
import type { ApplyPrefill } from './types'

export default function SearchExplorer({ onApply }: { onApply: (prefill: ApplyPrefill) => void }) {
  const { addWaitlistEntry } = useStore()

  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [location, setLocation] = useState('')
  const [company, setCompany] = useState('')

  const [results, setResults] = useState<JobPosting[]>([])
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
  const canSearch = effectiveKeywords.length > 0 && location.trim().length > 0

  async function handleExplore() {
    if (!canSearch || loading) return

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
      const res = await fetch('/api/explore/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: effectiveKeywords,
          location: location.trim(),
          company: company.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Search failed')
        return
      }
      setResults(data.results)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleWaitlist(result: JobPosting) {
    addWaitlistEntry({ companyName: result.company, jobTitle: result.title, jobLink: result.url })
    setSavedIds((prev) => new Set([...prev, result.id]))
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col gap-5 border-r border-zinc-200 bg-zinc-50 p-4">

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Keywords</p>
          <div
            className="flex min-h-[40px] cursor-text flex-wrap gap-1.5 rounded-lg border border-zinc-300 bg-white p-1.5 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200"
            onClick={() => document.getElementById('keyword-input')?.focus()}
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
              id="keyword-input"
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
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Location</p>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
            placeholder="e.g. Berlin, Germany"
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Company{' '}
            <span className="text-[10px] font-normal normal-case tracking-normal text-zinc-300">optional</span>
          </p>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
            placeholder="e.g. Google, SAP…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
          <p className="mt-1 text-[10px] text-zinc-400">Narrows to this company</p>
        </div>

        <button
          onClick={handleExplore}
          disabled={!canSearch || loading}
          className="mt-auto rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Searching…' : 'Explore'}
        </button>
      </aside>

      {/* Results */}
      <main className="flex-1 overflow-y-auto p-4">

        {searched && !loading && !error && (
          <p className="mb-3 text-xs text-zinc-500">
            {results.length} result{results.length !== 1 ? 's' : ''}
            {company.trim() && ` · ${company.trim()}`}
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
            <p className="text-sm font-medium text-zinc-500">No jobs found</p>
            <p className="mt-1 text-xs text-zinc-400">Try different keywords or broaden your location</p>
          </div>
        )}

        {!searched && (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <p className="text-sm text-zinc-400">Set your filters and click Explore</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                isSaved={savedIds.has(result.id)}
                onWaitlist={() => handleWaitlist(result)}
                onMarkApplied={() => onApply({ companyName: result.company, title: result.title, location: result.location, jobLink: result.url })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
