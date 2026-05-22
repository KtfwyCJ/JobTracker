'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_TYPES,
  INTERVIEW_TYPE_LABELS,
  type Interview,
  type InterviewType,
} from '../_lib/types'

interface Props {
  initial?: Interview
  defaultDate?: string
  defaultTime?: string
  onClose: () => void
}

export default function ScheduleInterviewModal({ initial, defaultDate, defaultTime, onClose }: Props) {
  const { data, addInterview, updateInterview, getCompany } = useStore()

  const [jobId, setJobId] = useState(initial?.jobId ?? '')
  const [type, setType] = useState<InterviewType>(initial?.type ?? 'phone_screen')
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(initial?.time ?? defaultTime ?? '10:00')
  const [duration, setDuration] = useState<number>(initial?.duration ?? 60)
  const [interviewer, setInterviewer] = useState(initial?.interviewer ?? '')
  const [link, setLink] = useState(initial?.link ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [jobSearch, setJobSearch] = useState('')

  const firstRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filteredJobs = data.jobs.filter((j) => {
    const company = getCompany(j.companyId)
    const label = `${company?.name ?? ''} ${j.title}`.toLowerCase()
    return label.includes(jobSearch.toLowerCase())
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!jobId) return
    const payload = { jobId, type, date, time, duration, interviewer, link, notes }
    if (initial) {
      updateInterview(initial.id, payload)
    } else {
      addInterview(payload)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {initial ? 'Edit Interview' : 'Schedule Interview'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Job *</label>
            <input
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              placeholder="Search jobs..."
              className="mb-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
            <select
              ref={firstRef}
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
              size={Math.min(filteredJobs.length + 1, 5)}
            >
              <option value="">Select a job</option>
              {filteredJobs.map((j) => {
                const company = getCompany(j.companyId)
                return (
                  <option key={j.id} value={j.id}>
                    {company?.name} — {j.title}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Type</label>
            <div className="flex gap-2">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                    type === t
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                  }`}
                >
                  {INTERVIEW_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Time *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              {INTERVIEW_DURATIONS.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Interviewer</label>
            <input
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Meeting Link</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Prep notes..."
              rows={2}
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
              {initial ? 'Save Changes' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
