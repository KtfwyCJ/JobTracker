'use client'

import { useEffect, useRef, useState } from 'react'
import type { Job } from '../_lib/types'
import { useStore } from '../_lib/store'
import StarRating from './StarRating'

export default function AddJobModal({ onClose, job }: { onClose: () => void; job?: Job }) {
  const { addJob, updateJob, data, getCompany } = useStore()

  const editingCompany = job ? getCompany(job.companyId) : undefined

  const [companyName, setCompanyName] = useState(editingCompany?.name ?? '')
  const [title, setTitle] = useState(job?.title ?? '')
  const [description, setDescription] = useState(job?.description ?? '')
  const [location, setLocation] = useState(job?.location ?? '')
  const [appliedAt, setAppliedAt] = useState(job?.appliedAt ?? new Date().toISOString().split('T')[0])
  const [requiresGerman, setRequiresGerman] = useState(job?.requiresGerman ?? false)
  const [jobPostingId, setJobPostingId] = useState(job?.jobPostingId ?? '')
  const [jobLink, setJobLink] = useState(job?.jobLink ?? '')
  const [matchLevel, setMatchLevel] = useState<number | undefined>(job?.matchLevel)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const suggestions = data.companies
    .map((c) => c.name)
    .filter((n) => n.toLowerCase().includes(companyName.toLowerCase()) && companyName.length > 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim() || !title.trim()) return
    const extra = { jobPostingId: jobPostingId.trim() || undefined, jobLink: jobLink.trim() || undefined, matchLevel }
    if (job) {
      updateJob({ jobId: job.id, companyName: companyName.trim(), title: title.trim(), description, location, appliedAt, requiresGerman, ...extra })
    } else {
      addJob({ companyName: companyName.trim(), title: title.trim(), description, location, appliedAt, requiresGerman, ...extra })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">{job ? 'Edit Job' : 'Add Job'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-zinc-700">Company *</label>
            <input
              ref={inputRef}
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setShowSuggestions(true) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Google"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-md">
                {suggestions.map((s) => (
                  <li
                    key={s}
                    onMouseDown={() => { setCompanyName(s); setShowSuggestions(false) }}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Job Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Engineer L5"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco / Remote"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Applied Date</label>
            <input
              type="date"
              value={appliedAt}
              onChange={(e) => setAppliedAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Role details, notes..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={requiresGerman}
              onChange={(e) => setRequiresGerman(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-700">Requires German</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Posting ID</label>
              <input
                value={jobPostingId}
                onChange={(e) => setJobPostingId(e.target.value)}
                placeholder="e.g. REQ-84321"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Match Level</label>
              <div className="flex h-[38px] items-center">
                <StarRating value={matchLevel} onChange={setMatchLevel} />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Job Link</label>
            <input
              value={jobLink}
              onChange={(e) => setJobLink(e.target.value)}
              placeholder="https://..."
              type="url"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              {job ? 'Save Changes' : 'Add Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
