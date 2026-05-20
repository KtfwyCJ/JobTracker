'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'
import type { LearningResourceStatus, LearningResourceType } from '../_lib/types'
import {
  LEARNING_RESOURCE_TYPES,
  LEARNING_RESOURCE_TYPE_LABELS,
  LEARNING_RESOURCE_STATUS_LABELS,
} from '../_lib/types'

const STATUS_OPTIONS: LearningResourceStatus[] = ['want_to_learn', 'in_progress', 'done']

export default function AddResourceModal({ onClose }: { onClose: () => void }) {
  const { addLearningResource, data, getCompany } = useStore()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<LearningResourceType>('book')
  const [status, setStatus] = useState<LearningResourceStatus>('want_to_learn')
  const [url, setUrl] = useState('')
  const [author, setAuthor] = useState('')
  const [notes, setNotes] = useState('')
  const [linkedJobIds, setLinkedJobIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggleJob(id: string) {
    setLinkedJobIds((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    addLearningResource({
      title: title.trim(),
      type,
      status,
      url: url.trim() || undefined,
      author: author.trim() || undefined,
      notes: notes.trim() || undefined,
      linkedJobIds,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Add Resource</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Title *</label>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Designing Data-Intensive Applications"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LearningResourceType)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                {LEARNING_RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{LEARNING_RESOURCE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LearningResourceStatus)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{LEARNING_RESOURCE_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Author / Creator</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Martin Kleppmann"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What do you want to learn from this?"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          {data.jobs.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Link to Jobs</label>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                {data.jobs.map((job) => {
                  const company = getCompany(job.companyId)
                  const checked = linkedJobIds.includes(job.id)
                  return (
                    <label
                      key={job.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-zinc-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleJob(job.id)}
                        className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900"
                      />
                      <span className="text-sm text-zinc-700">
                        {company?.name} — {job.title}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

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
              Add Resource
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
