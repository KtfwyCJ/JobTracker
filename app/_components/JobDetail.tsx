'use client'

import { useState, useEffect } from 'react'
import { useStore } from '../_lib/store'
import { JOB_STATUSES, STATUS_LABELS, STATUS_COLORS, type JobStatus } from '../_lib/types'
import Timeline from './Timeline'
import StarRating from './StarRating'
import ChevronIcon from './ChevronIcon'

export default function JobDetail() {
  const { data, selectedJobId, setSelectedJobId, updateJobStatus, updateJobLanguage, updateJobMatch, setEditingJobId, deleteJob, getCompany } = useStore()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [descOpen, setDescOpen] = useState(true)
  const [analysisOpen, setAnalysisOpen] = useState(true)

  useEffect(() => { setConfirmingDelete(false) }, [selectedJobId])

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

  function handleDelete() {
    deleteJob(job!.id)
    setSelectedJobId(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 pt-5 pb-4">

        {/* Zone 1: Identity + top-right actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-zinc-400">{company?.name}</div>
            <h2 className="mt-0.5 text-xl font-semibold text-zinc-900 leading-tight">{job.title}</h2>

            {/* Meta row 1: location, date, link */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
              {job.location && <span>📍 {job.location}</span>}
              {job.location && <span className="text-zinc-300">·</span>}
              <span>
                Applied{' '}
                {new Date(job.appliedAt + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {job.jobLink && (
                <>
                  <span className="text-zinc-300">·</span>
                  <a
                    href={job.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    View Posting →
                  </a>
                </>
              )}
            </div>

            {/* Meta row 2: stars, DE badge, posting ID */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <StarRating value={job.matchLevel} onChange={(n) => updateJobMatch(job.id, n)} />
              {job.requiresGerman && (
                <>
                  <span className="text-zinc-300 text-xs">·</span>
                  <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    DE
                  </span>
                </>
              )}
              {job.jobPostingId && (
                <>
                  <span className="text-zinc-300 text-xs">·</span>
                  <span className="font-mono text-xs text-zinc-400">{job.jobPostingId}</span>
                </>
              )}
            </div>
          </div>

          {/* Edit / Delete — top-right */}
          <div className="flex shrink-0 items-center gap-1 pt-1">
            {confirmingDelete ? (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                Delete?
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
              <>
                <button
                  onClick={() => setEditingJobId(job.id)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Zone 2: Status pills */}
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {JOB_STATUSES.map((s) => {
              const isActive = job.status === s
              return (
                <button
                  key={s}
                  onClick={() => updateJobStatus(job.id, s as JobStatus)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : `border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300`
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5 space-y-5">

        {/* Requires German toggle */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={job.requiresGerman}
            onChange={(e) => updateJobLanguage(job.id, e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
          />
          <span className="text-sm text-zinc-500">Requires German</span>
        </label>

        {/* Description */}
        {job.description && (
          <div>
            <button
              onClick={() => setDescOpen((o) => !o)}
              className="mb-2 flex w-full items-center gap-1.5 text-left"
            >
              <ChevronIcon open={descOpen} />
              <h3 className="text-sm font-semibold text-zinc-700">Description</h3>
            </button>
            {descOpen && (
              <p className="whitespace-pre-wrap text-sm text-zinc-600 leading-relaxed pl-5">{job.description}</p>
            )}
          </div>
        )}

        {/* Analysis */}
        {job.analysis && (
          <div>
            <button
              onClick={() => setAnalysisOpen((o) => !o)}
              className="mb-2 flex w-full items-center gap-1.5 text-left"
            >
              <ChevronIcon open={analysisOpen} />
              <h3 className="text-sm font-semibold text-zinc-700">Analysis</h3>
            </button>
            {analysisOpen && (
              <pre className="whitespace-pre-wrap border-l-2 border-zinc-300 bg-zinc-50 pl-3 py-2 font-mono text-xs leading-relaxed text-zinc-600 ml-5">{job.analysis}</pre>
            )}
          </div>
        )}

        <Timeline jobId={job.id} />
      </div>
    </div>
  )
}
