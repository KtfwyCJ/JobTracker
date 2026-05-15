'use client'

import { useState } from 'react'
import { useStore } from '../_lib/store'
import { STATUS_COLORS, STATUS_LABELS } from '../_lib/types'
import StarRating from './StarRating'

const PALETTE = [
  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }, // blue
  { bg: '#dcfce7', text: '#166534', border: '#86efac' }, // green
  { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' }, // pink
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }, // amber
  { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' }, // purple
  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' }, // orange
  { bg: '#cffafe', text: '#155e75', border: '#67e8f9' }, // cyan
  { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }, // red
]

function companyTheme(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff
  return PALETTE[h % PALETTE.length]
}

export default function JobList() {
  const { data, selectedJobId, setSelectedJobId, search, setSearch } = useStore()
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set())

  function toggleCompany(id: string) {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const q = search.toLowerCase()
  const filteredCompanies = data.companies
    .filter((c) => {
      if (!data.jobs.some((j) => j.companyId === c.id)) return false
      if (!q) return true
      if (c.name.toLowerCase().includes(q)) return true
      return data.jobs.some(
        (j) => j.companyId === c.id && j.title.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="p-3 border-b border-zinc-100">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies or jobs..."
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filteredCompanies.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            {search ? 'No results' : 'No jobs yet — click + Add Job'}
          </p>
        )}
        {filteredCompanies.map((company) => {
          const jobs = data.jobs
            .filter((j) => {
              if (j.companyId !== company.id) return false
              if (!q) return true
              return (
                company.name.toLowerCase().includes(q) ||
                j.title.toLowerCase().includes(q)
              )
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

          const isCollapsed = collapsedCompanies.has(company.id)
          const theme = companyTheme(company.name)

          return (
            <div key={company.id} className="mb-1">
              <button
                onClick={() => toggleCompany(company.id)}
                className="flex w-full items-center gap-1.5 border-l-[3px] px-3 py-2"
                style={{ backgroundColor: theme.bg, borderLeftColor: theme.border }}
              >
                <span className="flex-1 text-left text-xs font-bold" style={{ color: theme.text }}>
                  {company.name}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: theme.border + '55', color: theme.text }}
                >
                  {jobs.length}
                </span>
                <span className="text-[10px]" style={{ color: theme.text + 'aa' }}>
                  {isCollapsed ? '▶' : '▼'}
                </span>
              </button>

              {!isCollapsed && jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full px-3 py-2 text-left transition-colors hover:bg-zinc-50 ${
                    selectedJobId === job.id ? 'bg-zinc-100' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-800 leading-snug">{job.title}</span>
                    <div className="mt-0.5 flex shrink-0 items-center gap-1">
                      {job.requiresGerman && (
                        <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          DE
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[job.status]}`}
                      >
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                  </div>
                  {job.location && (
                    <p className="mt-0.5 text-xs text-zinc-400">{job.location}</p>
                  )}
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-400">
                      Applied {new Date(job.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {job.matchLevel && (
                      <StarRating value={job.matchLevel} readOnly />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
