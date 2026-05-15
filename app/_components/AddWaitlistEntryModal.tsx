'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'
import StarRating from './StarRating'

export default function AddWaitlistEntryModal({ onClose }: { onClose: () => void }) {
  const { addWaitlistEntry } = useStore()

  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobPostingId, setJobPostingId] = useState('')
  const [jobLink, setJobLink] = useState('')
  const [matchLevel, setMatchLevel] = useState<number | undefined>(undefined)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim() || !jobTitle.trim()) return
    addWaitlistEntry({
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      jobPostingId: jobPostingId.trim() || undefined,
      jobLink: jobLink.trim() || undefined,
      matchLevel,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Add to Waiting List</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Company *</label>
            <input
              ref={inputRef}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Google"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Job Title *</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
          </div>

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
              Add Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
