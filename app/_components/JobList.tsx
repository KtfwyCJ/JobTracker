'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { useStore } from '../_lib/store'
import { formatAppliedDate, groupJobsByCompany, type CompanyGroup } from '../_lib/jobGroups'
import { STATUS_COLORS, STATUS_DOT_COLORS, STATUS_LABELS, type Job, type JobStatus } from '../_lib/types'
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
  { id: 'team_interview', label: 'Team' },
  { id: 'onsite', label: 'Onsite' },
  { id: 'offer', label: 'Offer' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
]

/** Memoised so selecting a job re-renders only the previously and newly selected cards. */
const JobCard = memo(function JobCard({ job, isSelected, onSelect }: {
  job: Job; isSelected: boolean; onSelect: (id: string) => void
}) {
  const dotColor = STATUS_DOT_COLORS[job.status]
  return (
    <button
      onClick={() => onSelect(job.id)}
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
          {formatAppliedDate(job.appliedAt)}
        </span>
        {job.matchLevel !== undefined && (
          <StarRating value={job.matchLevel} readOnly />
        )}
      </div>
    </button>
  )
})

/**
 * Memoised per company. `selectedId` is only passed to the group that contains the selected job,
 * so a selection change skips every other company entirely.
 */
const CompanySection = memo(function CompanySection({ group, isCollapsed, selectedId, onToggle, onSelect }: {
  group: CompanyGroup; isCollapsed: boolean; selectedId: string | null
  onToggle: (id: string) => void; onSelect: (id: string) => void
}) {
  const { company, jobs } = group
  const theme = companyTheme(company.name)
  const initial = company.name.charAt(0).toUpperCase()
  return (
    <div className="mb-1">
      {/* Company header */}
      <button
        onClick={() => onToggle(company.id)}
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
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} isSelected={selectedId === job.id} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
})

export default function JobList() {
  const { data, selectedJobId, setSelectedJobId, search, setSearch, starFilter, setStarFilter } = useStore()
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all')

  const toggleCompany = useCallback((id: string) => {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function handleChipClick(id: JobStatus | 'all') {
    setStarFilter(null)
    setFilterStatus((prev) => (prev === id ? 'all' : id))
  }

  // Recomputed only when the data or filters change — not when a job is selected.
  const filteredCompanies = useMemo(
    () => groupJobsByCompany(data.companies, data.jobs, { status: filterStatus, star: starFilter, search }),
    [data.companies, data.jobs, filterStatus, starFilter, search],
  )

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
        {filteredCompanies.map((group) => (
          <CompanySection
            key={group.company.id}
            group={group}
            isCollapsed={collapsedCompanies.has(group.company.id)}
            selectedId={selectedJobId !== null && group.jobs.some((j) => j.id === selectedJobId) ? selectedJobId : null}
            onToggle={toggleCompany}
            onSelect={setSelectedJobId}
          />
        ))}
      </nav>
    </aside>
  )
}
