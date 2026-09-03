'use client'

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { COMPANY_DIRECTORY } from '../../_lib/data/companies'
import { groupByPriority } from '../../_lib/companyDirectory'
import { useStore } from '../../_lib/store'
import CompanyList from './CompanyList'
import CompanyJobResults from './CompanyJobResults'
import type { ApplyPrefill } from './types'

export interface CompanyJob {
  id: string
  title: string
  company: string
  location: string
  remote: boolean
  jobTypes: string[]
  tags: string[]
  postedAt: string
  url: string
  source: 'linkedin' | 'indeed' | 'adzuna' | 'greenhouse' | 'ashby' | 'lever' | 'smartrecruiters' | 'personio'
  myPriority: string
  category: string
  industry: string
  companyCity: string
  careerUrl: string | null
}

export interface SourceReport {
  linkedin: string
  indeed: string
  adzuna: string
  ats: string
}

interface CacheEntry {
  results: CompanyJob[]
  sources: SourceReport
  searchedAt: number
}

const DEFAULT_KEYWORDS = ['Software Engineer', 'AI Engineer', 'Frontend Engineer', 'Frontend', 'Front End', 'Front-end', 'AI Application Developer', 'AI Developer', 'Machine Learning Engineer', 'ML Engineer', 'Fullstack Engineer', 'Full Stack Engineer', 'Full-stack Engineer', 'Fullstack Developer']
const TIER_CONCURRENCY = 3

export default function CompanyJobExplorer({ onApply }: { onApply: (p: ApplyPrefill) => void }) {
  const { data, addWaitlistEntry } = useStore()

  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS)
  const [keywordInput, setKeywordInput] = useState('')
  const [minDate, setMinDate] = useState('')
  const [country, setCountry] = useState('Germany')
  const [city, setCity] = useState('')
  const [nameFilter, setNameFilter] = useState('')

  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map())
  const [inFlight, setInFlight] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [aggregated, setAggregated] = useState<string[] | null>(null)
  const [tierRun, setTierRun] = useState<{ tier: string; done: number; total: number } | null>(null)
  const [filtersChangedHint, setFiltersChangedHint] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const groups = useMemo(() => groupByPriority(COMPANY_DIRECTORY), [])
  const cancelTierRef = useRef(false)

  const pendingKeyword = keywordInput.trim()
  const effectiveKeywords = pendingKeyword && !keywords.includes(pendingKeyword)
    ? [...keywords, pendingKeyword]
    : keywords

  const filterSig = JSON.stringify([effectiveKeywords, minDate, country, city])
  const prevSig = useRef(filterSig)
  useEffect(() => {
    if (prevSig.current === filterSig) return
    prevSig.current = filterSig
    setCache(new Map())
    setSelected(null)
    setAggregated(null)
    setInFlight(new Set())
    cancelTierRef.current = true
    setTierRun(null)
    setFiltersChangedHint(true)
    const t = setTimeout(() => setFiltersChangedHint(false), 4000)
    return () => clearTimeout(t)
  }, [filterSig])

  function addKeyword() {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) setKeywords((p) => [...p, kw])
    setKeywordInput('')
  }
  function handleKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length) {
      setKeywords((p) => p.slice(0, -1))
    }
  }

  async function fetchCompany(name: string): Promise<CacheEntry> {
    try {
      const res = await fetch('/api/explore/company-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: name, keywords: effectiveKeywords, country, city, publishedAfter: minDate }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        return { results: [], sources: { linkedin: 'error', indeed: 'error', adzuna: 'error', ats: 'error' }, searchedAt: Date.now() }
      }
      return { results: json.results as CompanyJob[], sources: json.sources as SourceReport, searchedAt: Date.now() }
    } catch {
      return { results: [], sources: { linkedin: 'error', indeed: 'error', adzuna: 'error', ats: 'error' }, searchedAt: Date.now() }
    }
  }

  async function searchCompany(name: string, opts: { force?: boolean; select?: boolean } = {}) {
    const select = opts.select ?? true
    if (!opts.force && cache.has(name)) {
      if (select) { setSelected(name); setAggregated(null) }
      return
    }
    if (inFlight.has(name)) {
      if (select) { setSelected(name); setAggregated(null) }
      return
    }
    if (select) { setSelected(name); setAggregated(null) }
    setInFlight((p) => new Set(p).add(name))
    try {
      const entry = await fetchCompany(name)
      setCache((p) => new Map(p).set(name, entry))
    } finally {
      setInFlight((p) => {
        const n = new Set(p)
        n.delete(name)
        return n
      })
    }
  }

  async function searchTier(tierKey: string) {
    const group = groups.find((g) => g.key === tierKey)
    if (!group || tierRun) return
    const targets = group.companies.map((c) => c.company).filter((n) => !cache.has(n))
    setAggregated(group.companies.map((c) => c.company))
    setSelected(null)
    cancelTierRef.current = false
    setTierRun({ tier: tierKey, done: 0, total: targets.length })

    let idx = 0
    let done = 0
    const worker = async () => {
      while (idx < targets.length && !cancelTierRef.current) {
        const name = targets[idx++]
        await searchCompany(name, { select: false })
        done++
        setTierRun({ tier: tierKey, done, total: targets.length })
      }
    }
    await Promise.all(Array.from({ length: Math.min(TIER_CONCURRENCY, targets.length || 1) }, worker))
    setTierRun(null)
  }
  function cancelTier() {
    cancelTierRef.current = true
    setTierRun(null)
  }

  function handleWaitlist(job: CompanyJob) {
    addWaitlistEntry({ companyName: job.company, jobTitle: job.title, jobLink: job.url })
    setSavedIds((p) => new Set(p).add(job.id))
  }

  function alreadyTracked(job: CompanyJob): boolean {
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`
    const inJobs = data.jobs.some((j) => {
      const c = data.companies.find((x) => x.id === j.companyId)
      return `${(c?.name ?? '').toLowerCase()}|${j.title.toLowerCase()}` === key
    })
    return inJobs || data.waitlist.some((w) => `${w.companyName.toLowerCase()}|${w.jobTitle.toLowerCase()}` === key)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filters */}
      <aside className="flex w-56 flex-shrink-0 flex-col gap-5 border-r border-zinc-200 bg-zinc-50 p-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Keywords</p>
          <div
            className="flex min-h-[40px] cursor-text flex-wrap gap-1.5 rounded-lg border border-zinc-300 bg-white p-1.5 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-200"
            onClick={() => document.getElementById('cje-keyword-input')?.focus()}
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
              id="cje-keyword-input"
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
            <button onClick={() => setMinDate('')} className="mt-1 text-[10px] text-zinc-400 underline decoration-dotted hover:text-zinc-600">Clear</button>
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

        {filtersChangedHint && (
          <p className="text-[10px] text-amber-600">Filters changed — searches cleared.</p>
        )}
        <p className="text-[10px] text-zinc-400">
          Click a company to search LinkedIn, Indeed &amp; Adzuna (and its job board) for its roles matching these filters.
        </p>
      </aside>

      <CompanyList
        groups={groups}
        cache={cache}
        inFlight={inFlight}
        selected={selected}
        nameFilter={nameFilter}
        onNameFilter={setNameFilter}
        onSelect={(name) => searchCompany(name)}
        onSearchTier={searchTier}
        onCancelTier={cancelTier}
        tierRun={tierRun}
      />

      <CompanyJobResults
        mode={aggregated ? 'aggregated' : 'single'}
        selected={selected}
        aggregated={aggregated}
        cache={cache}
        inFlight={inFlight}
        savedIds={savedIds}
        alreadyTracked={alreadyTracked}
        onWaitlist={handleWaitlist}
        onApply={onApply}
        onResearch={(name) => searchCompany(name, { force: true })}
      />
    </div>
  )
}
