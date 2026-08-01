'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { COMPANY_DIRECTORY, type CompanyDirectoryEntry } from '../_lib/data/companies'

type Column = {
  key: string
  label: string
  align?: 'right'
  wrap?: boolean
  render: (row: CompanyDirectoryEntry) => ReactNode
}

const ALL = 'All'

const CATEGORY_OPTIONS = Array.from(new Set(COMPANY_DIRECTORY.map((c) => c.category))).sort()
const GERMAN_REQUIREMENT_OPTIONS = Array.from(new Set(COMPANY_DIRECTORY.map((c) => c.germanRequirement))).sort()
const PRIORITY_OPTIONS = Array.from(new Set(COMPANY_DIRECTORY.map((c) => c.myPriority))).sort()

function LinkCell({ href }: { href: string | null }) {
  const valid = href && /^https?:\/\/[^/]/.test(href)
  if (!valid) return <span className="text-zinc-300">—</span>
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-zinc-500 hover:text-zinc-900">
      ↗
    </a>
  )
}

const COLUMNS: Column[] = [
  { key: 'hq', label: 'HQ', render: (r) => r.hq },
  { key: 'mainGermanyOffices', label: 'Main Germany Offices', render: (r) => r.mainGermanyOffices },
  { key: 'category', label: 'Category', render: (r) => r.category },
  { key: 'industry', label: 'Industry', render: (r) => r.industry },
  { key: 'igMetall', label: 'IG Metall', render: (r) => r.igMetall },
  { key: 'englishFriendly', label: 'English Friendly (1-5)', align: 'right', render: (r) => r.englishFriendly },
  { key: 'germanRequirement', label: 'German Requirement', render: (r) => r.germanRequirement },
  { key: 'aiLlm', label: 'AI/LLM', align: 'right', render: (r) => r.aiLlm },
  { key: 'agent', label: 'Agent', align: 'right', render: (r) => r.agent },
  { key: 'cloudPlatform', label: 'Cloud/Platform', align: 'right', render: (r) => r.cloudPlatform },
  { key: 'frontend', label: 'Frontend', align: 'right', render: (r) => r.frontend },
  { key: 'backend', label: 'Backend', align: 'right', render: (r) => r.backend },
  { key: 'dataMl', label: 'Data/ML', align: 'right', render: (r) => r.dataMl },
  { key: 'visaSponsorshipLikelihood', label: 'Visa Sponsorship Likelihood', align: 'right', render: (r) => r.visaSponsorshipLikelihood },
  { key: 'salaryCompetitiveness', label: 'Salary Competitiveness', align: 'right', render: (r) => r.salaryCompetitiveness },
  { key: 'equityRsu', label: 'Equity / RSU', render: (r) => r.equityRsu },
  { key: 'ats', label: 'ATS', render: (r) => r.ats },
  { key: 'remoteHybrid', label: 'Remote/Hybrid', render: (r) => r.remoteHybrid },
  { key: 'careerUrl', label: 'Career URL', render: (r) => <LinkCell href={r.careerUrl} /> },
  { key: 'linkedInJobs', label: 'LinkedIn Jobs', render: (r) => <LinkCell href={r.linkedInJobs} /> },
  { key: 'myPriority', label: 'My Priority', render: (r) => r.myPriority },
  { key: 'notes', label: 'Notes', wrap: true, render: (r) => r.notes ?? <span className="text-zinc-300">—</span> },
]

export default function CompanyDirectory() {
  const [companyQuery, setCompanyQuery] = useState('')
  const [hqQuery, setHqQuery] = useState('')
  const [officesQuery, setOfficesQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [igMetall, setIgMetall] = useState(ALL)
  const [germanRequirement, setGermanRequirement] = useState(ALL)
  const [priority, setPriority] = useState(ALL)

  const filtersActive =
    companyQuery.trim() !== '' ||
    hqQuery.trim() !== '' ||
    officesQuery.trim() !== '' ||
    category !== ALL ||
    igMetall !== ALL ||
    germanRequirement !== ALL ||
    priority !== ALL

  function clearFilters() {
    setCompanyQuery('')
    setHqQuery('')
    setOfficesQuery('')
    setCategory(ALL)
    setIgMetall(ALL)
    setGermanRequirement(ALL)
    setPriority(ALL)
  }

  const filtered = useMemo(() => {
    const c = companyQuery.trim().toLowerCase()
    const hq = hqQuery.trim().toLowerCase()
    const offices = officesQuery.trim().toLowerCase()
    return COMPANY_DIRECTORY.filter((row) => {
      if (c && !row.company.toLowerCase().includes(c)) return false
      if (hq && !row.hq.toLowerCase().includes(hq)) return false
      if (offices && !row.mainGermanyOffices.toLowerCase().includes(offices)) return false
      if (category !== ALL && row.category !== category) return false
      if (igMetall !== ALL && row.igMetall !== igMetall) return false
      if (germanRequirement !== ALL && row.germanRequirement !== germanRequirement) return false
      if (priority !== ALL && row.myPriority !== priority) return false
      return true
    })
  }, [companyQuery, hqQuery, officesQuery, category, igMetall, germanRequirement, priority])

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-56 flex-shrink-0 flex-col gap-5 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Company</p>
          <input
            value={companyQuery}
            onChange={(e) => setCompanyQuery(e.target.value)}
            placeholder="Search company…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">HQ</p>
          <input
            value={hqQuery}
            onChange={(e) => setHqQuery(e.target.value)}
            placeholder="e.g. Munich"
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Main Germany Offices</p>
          <input
            value={officesQuery}
            onChange={(e) => setOfficesQuery(e.target.value)}
            placeholder="e.g. Berlin"
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</p>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          >
            <option value={ALL}>All</option>
            {CATEGORY_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">IG Metall</p>
          <select
            value={igMetall}
            onChange={(e) => setIgMetall(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          >
            <option value={ALL}>All</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">German Requirement</p>
          <select
            value={germanRequirement}
            onChange={(e) => setGermanRequirement(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          >
            <option value={ALL}>All</option>
            {GERMAN_REQUIREMENT_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">My Priority</p>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          >
            <option value={ALL}>All</option>
            {PRIORITY_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-left text-[10px] text-zinc-400 underline decoration-dotted transition-colors hover:text-zinc-600"
          >
            Clear filters
          </button>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
        <p className="mb-3 shrink-0 text-xs text-zinc-500">
          {filtered.length} of {COMPANY_DIRECTORY.length} companies
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <p className="text-sm font-medium text-zinc-500">No companies match your filters</p>
            <p className="mt-1 text-xs text-zinc-400">Try loosening or clearing a filter</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-xl border border-zinc-200">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 whitespace-nowrap border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-bold uppercase tracking-wide text-zinc-500">
                    Company
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`sticky top-0 z-10 whitespace-nowrap border-b border-zinc-200 bg-zinc-50 px-3 py-2 font-bold uppercase tracking-wide text-zinc-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={`${row.company}-${i}`} className="odd:bg-white even:bg-zinc-50 hover:bg-zinc-100">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-zinc-200 bg-inherit px-3 py-2 font-semibold text-zinc-900">
                      {row.company}
                    </td>
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 text-zinc-600 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.wrap ? 'whitespace-normal' : 'whitespace-nowrap'}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
