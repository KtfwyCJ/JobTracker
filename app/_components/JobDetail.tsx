'use client'

import { useState } from 'react'
import { useStore } from '../_lib/store'
import { JOB_STATUSES, STATUS_LABELS, STATUS_COLORS, type JobStatus } from '../_lib/types'
import Timeline from './Timeline'
import StarRating from './StarRating'

export default function JobDetail() {
  const { data, selectedJobId, setSelectedJobId, updateJobStatus, updateJobLanguage, updateJobMatch, setEditingJobId, deleteJob, getCompany } = useStore()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [descOpen, setDescOpen] = useState(true)

  if (!selectedJobId) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-400 text-sm">
        Select a job to view details
      </div>
    )
  }

  const job = data.jobs.find((j) => j.id === selectedJobId)
  if (!job) return null

  const company = getCompany(job.companyId)

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateJobStatus(job!.id, e.target.value as JobStatus)
  }

  function handleDelete() {
    deleteJob(job!.id)
    setSelectedJobId(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-200 bg-white px-6 py-5">
        <div className="mb-1 text-sm text-zinc-500">{company?.name}</div>
        <h2 className="text-xl font-semibold text-zinc-900">{job.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {job.location && <span>📍 {job.location}</span>}
          <span>
            Applied{' '}
            {new Date(job.appliedAt + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {job.jobPostingId && (
            <span className="font-mono text-xs text-zinc-400">{job.jobPostingId}</span>
          )}
          {job.jobLink && (
            <a
              href={job.jobLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
              title="View job posting"
            >
              View Posting →
            </a>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-xs text-zinc-400">Match</span>
          <StarRating value={job.matchLevel} onChange={(n) => updateJobMatch(job.id, n)} />
        </div>

        <div className="mt-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={job.requiresGerman}
              onChange={(e) => updateJobLanguage(job.id, e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="text-sm text-zinc-600">Requires German</span>
          </label>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <select
            value={job.status}
            onChange={handleStatusChange}
            className={`rounded-full border px-3 py-1 text-sm font-medium outline-none cursor-pointer ${STATUS_COLORS[job.status]}`}
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {confirmingDelete ? (
            <span className="flex items-center gap-2 text-sm text-zinc-500">
              Delete this job?
              <button
                onClick={handleDelete}
                className="font-medium text-red-600 hover:text-red-700"
              >
                Confirm
              </button>
              <span className="text-zinc-300">·</span>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="hover:text-zinc-700"
              >
                Cancel
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <button
                onClick={() => setEditingJobId(job.id)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-red-600"
              >
                Delete
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-6">
        {job.description && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-700">Description</h3>
              <button
                onClick={() => setDescOpen((o) => !o)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                {descOpen ? '▲ Hide' : '▼ Show'}
              </button>
            </div>
            {descOpen && (
              <p className="whitespace-pre-wrap text-sm text-zinc-600 leading-relaxed">{job.description}</p>
            )}
          </div>
        )}
        <Timeline jobId={job.id} />
      </div>
    </div>
  )
}
