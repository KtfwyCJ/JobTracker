'use client'

import { useState } from 'react'
import { useStore } from '../_lib/store'
import { STATUS_COLORS, STATUS_DOT_COLORS, STATUS_LABELS, type JobStatus } from '../_lib/types'
import StarRating from './StarRating'
import ChevronIcon from './ChevronIcon'

const PALETTE = [
  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
  { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
]

function companyTheme(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff
  return PALETTE[h % PALETTE.length]
}


const FILTER_CHIPS: { id: JobStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'applied', label: 'Applied' },
  { id: 'phone_screen', label: 'Phone' },
  { id: 'technical_interview', label: 'Tech' },
  { id: 'onsite', label: 'Onsite' },
  { id: 'offer', label: 'Offer' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
]

export default function JobList() {
  const { data, selectedJobId, setSelectedJobId, search, setSearch, starFilter, setStarFilter } = useStore()
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all')

  function toggleCompany(id: string) {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleChipClick(id: JobStatus | 'all') {
    setStarFilter(null)
    setFilterStatus((prev) => (prev === id ? 'all' : id))
  }

  const q = search.toLowerCase()

  function jobMatchesFilters(j: { companyId: string; status: JobStatus; title: string; matchLevel?: number }, companyName: string) {
    if (filterStatus !== 'all' && j.status !== filterStatus) return false
    if (starFilter !== null && j.matchLevel !== starFilter) return false
    if (!q) return true
    return companyName.toLowerCase().includes(q) || j.title.toLowerCase().includes(q)
  }

  const filteredCompanies = data.companies
    .filter((c) => data.jobs.some((j) => j.companyId === c.id && jobMatchesFilters(j, c.name)))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="p-3 border-b border-zinc-100">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies or jobs..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />
      </div>

      {/* Status + star filter chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-100 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (starFilter === 5) {
              setStarFilter(null)
            } else {
              setStarFilter(5)
              setFilterStatus('all')
            }
          }}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
            starFilter === 5
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
          }`}
        >
          ⭐ 5-Star
        </button>
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleChipClick(chip.id)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
              filterStatus === chip.id && starFilter === null
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filteredCompanies.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            {search || filterStatus !== 'all' ? 'No results' : 'No jobs yet — click + Add Job'}
          </p>
        )}
        {filteredCompanies.map((company) => {
          const jobs = data.jobs
            .filter((j) => j.companyId === company.id && jobMatchesFilters(j, company.name))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

          const isCollapsed = collapsedCompanies.has(company.id)
          const theme = companyTheme(company.name)
          const initial = company.name.charAt(0).toUpperCase()

          return (
            <div key={company.id} className="mb-1">
              {/* Company header */}
              <button
                onClick={() => toggleCompany(company.id)}
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-50 transition-colors"
              >
                {/* Colored initial avatar */}
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: theme.bg, color: theme.text }}
                >
                  {initial}
                </span>
                <span className="flex-1 text-left text-xs font-bold text-zinc-700 truncate">
                  {company.name}
                </span>
                <span className="text-[10px] text-zinc-400">{jobs.length}</span>
                <ChevronIcon open={!isCollapsed} />
              </button>

              {/* Job cards */}
              {!isCollapsed && (
                <div className="mt-0.5 flex flex-col gap-1 px-2 pb-1">
                  {jobs.map((job) => {
                    const isSelected = selectedJobId === job.id
                    const dotColor = STATUS_DOT_COLORS[job.status]

                    return (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`w-full rounded-lg border p-2.5 text-left shadow-sm transition-all ${
                          isSelected
                            ? 'border-zinc-900 bg-zinc-900 shadow-md'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md'
                        }`}
                      >
                        {/* Top row: status dot + title + badge */}
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                          <span className={`flex-1 text-[11.5px] font-semibold leading-snug ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                            {job.title}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            {job.requiresGerman && (
                              <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${isSelected ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                DE
                              </span>
                            )}
                            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${isSelected ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : STATUS_COLORS[job.status]}`}>
                              {STATUS_LABELS[job.status]}
                            </span>
                          </div>
                        </div>

                        {/* Bottom row: date + stars */}
                        <div className="mt-1.5 flex items-center justify-between gap-2 pl-4">
                          <span className={`text-[10px] ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            {new Date(job.appliedAt + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {job.matchLevel !== undefined && (
                            <StarRating value={job.matchLevel} readOnly />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
