'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '../_lib/store'
import type { LearningResource, LearningResourceStatus, LearningResourceType } from '../_lib/types'
import {
  LEARNING_RESOURCE_STATUS_COLORS,
  LEARNING_RESOURCE_STATUS_LABELS,
  LEARNING_RESOURCE_TYPE_LABELS,
  LEARNING_RESOURCE_TYPES,
} from '../_lib/types'
import { STATUS_DOT_COLORS } from '../_lib/types'

const STATUS_OPTIONS: LearningResourceStatus[] = ['want_to_learn', 'in_progress', 'done']

export default function ResourceDrawer({
  resource,
  onClose,
}: {
  resource: LearningResource
  onClose: () => void
}) {
  const { data, getCompany, updateLearningResource, deleteLearningResource, setSelectedJobId } = useStore()
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(resource.title)
  const [type, setType] = useState<LearningResourceType>(resource.type)
  const [url, setUrl] = useState(resource.url ?? '')
  const [author, setAuthor] = useState(resource.author ?? '')
  const [notes, setNotes] = useState(resource.notes ?? '')
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Sync local state when resource prop changes
  useEffect(() => {
    setTitle(resource.title)
    setType(resource.type)
    setUrl(resource.url ?? '')
    setAuthor(resource.author ?? '')
    setNotes(resource.notes ?? '')
    setEditing(false)
  }, [resource.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveEdit() {
    updateLearningResource(resource.id, {
      title: title.trim() || resource.title,
      type,
      url: url.trim() || undefined,
      author: author.trim() || undefined,
    })
    setEditing(false)
  }

  function handleNotesChange(val: string) {
    setNotes(val)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      updateLearningResource(resource.id, { notes: val.trim() || undefined })
    }, 400)
  }

  function handleStatusChange(status: LearningResourceStatus) {
    updateLearningResource(resource.id, { status })
  }

  function handleDelete() {
    deleteLearningResource(resource.id)
    onClose()
  }

  function handleLinkedJobClick(jobId: string) {
    setSelectedJobId(jobId)
    router.push('/dashboard')
  }

  const linkedJobs = resource.linkedJobIds
    .map((id) => data.jobs.find((j) => j.id === id))
    .filter(Boolean) as typeof data.jobs

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm font-semibold outline-none focus:border-zinc-500"
              autoFocus
            />
          ) : (
            <h3 className="text-sm font-semibold text-zinc-900 leading-snug">{resource.title}</h3>
          )}
          <p className="mt-0.5 text-xs text-zinc-400">
            {LEARNING_RESOURCE_TYPE_LABELS[resource.type]}
            {resource.author && ` · ${resource.author}`}
          </p>
        </div>
        <button onClick={onClose} className="shrink-0 text-lg leading-none text-zinc-300 hover:text-zinc-500">
          ×
        </button>
      </div>

      {/* Status */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity ${
              LEARNING_RESOURCE_STATUS_COLORS[s]
            } ${resource.status === s ? 'opacity-100 ring-1 ring-inset ring-current/30' : 'opacity-40 hover:opacity-70'}`}
          >
            {LEARNING_RESOURCE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Edit fields */}
      {editing && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="mb-0.5 block text-xs font-medium text-zinc-500">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LearningResourceType)}
              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
            >
              {LEARNING_RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{LEARNING_RESOURCE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-xs font-medium text-zinc-500">Author / Creator</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Martin Kleppmann"
              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-xs font-medium text-zinc-500">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        </div>
      )}

      {/* URL (read mode) */}
      {!editing && resource.url && (
        <div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Link</p>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 underline break-all hover:text-blue-700"
          >
            {resource.url}
          </a>
        </div>
      )}

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes..."
          rows={4}
          className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-200"
        />
      </div>

      {/* Linked jobs */}
      {linkedJobs.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Linked Jobs</p>
          <div className="flex flex-col gap-1">
            {linkedJobs.map((job) => {
              const company = getCompany(job.companyId)
              return (
                <button
                  key={job.id}
                  onClick={() => handleLinkedJobClick(job.id)}
                  className="flex items-center gap-2 rounded-md bg-zinc-50 px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[job.status]}`} />
                  {company?.name} — {job.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex gap-2 pt-2">
        {editing ? (
          <>
            <button
              onClick={saveEdit}
              className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg bg-zinc-100 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 rounded-lg bg-zinc-100 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
