'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPES,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  type Interview,
  type InterviewType,
} from '../_lib/types'

interface Props {
  interview: Interview
  anchorRect: DOMRect
  onClose: () => void
}

export default function InterviewPopover({ interview, anchorRect, onClose }: Props) {
  const { getJob, getCompany, deleteInterview, updateInterview } = useStore()
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Edit state
  const [type, setType] = useState<InterviewType>(interview.type)
  const [date, setDate] = useState(interview.date)
  const [time, setTime] = useState(interview.time)
  const [duration, setDuration] = useState(interview.duration)
  const [interviewer, setInterviewer] = useState(interview.interviewer)
  const [link, setLink] = useState(interview.link)
  const [notes, setNotes] = useState(interview.notes)

  const job = getJob(interview.jobId)
  const company = job ? getCompany(job.companyId) : undefined

  const [hour, minute] = interview.time.split(':').map(Number)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  const timeLabel = `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`
  const endMinutes = hour * 60 + minute + interview.duration
  const endHour = Math.floor(endMinutes / 60)
  const endMin = endMinutes % 60
  const endAmpm = endHour >= 12 ? 'PM' : 'AM'
  const endHour12 = endHour % 12 || 12
  const endLabel = `${endHour12}:${String(endMin).padStart(2, '0')} ${endAmpm}`

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClickOutside)
    }
  }, [onClose])

  function handleSave() {
    updateInterview(interview.id, { type, date, time, duration, interviewer, link, notes })
    onClose()
  }

  // Position below anchor, clamp to viewport
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 420)
  const left = Math.min(anchorRect.left, window.innerWidth - 300)

  if (editing) {
    return (
      <div
        ref={ref}
        className="fixed z-50 w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
        style={{ top, left, maxHeight: 'calc(100vh - 32px)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Edit Interview</p>
          <button onClick={onClose} className="text-lg leading-none text-zinc-300 hover:text-zinc-500">×</button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Type</label>
            <div className="flex gap-1.5">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border px-1.5 py-1 text-[10px] font-medium transition-colors ${
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

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              {INTERVIEW_DURATIONS.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>

          {/* Interviewer */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Interviewer</label>
            <input
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          {/* Link */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Meeting Link</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Prep notes..."
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-zinc-100 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={() => { deleteInterview(interview.id); onClose() }}
              className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
      style={{ top, left }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{job?.title}</p>
          <p className="text-xs text-zinc-500">{company?.name}</p>
        </div>
        <span
          className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[interview.type]}`}
        >
          {INTERVIEW_TYPE_LABELS[interview.type]}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-zinc-700">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">📅</span>
          <span>
            {new Date(interview.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400">🕐</span>
          <span>{timeLabel} – {endLabel} ({interview.duration} min)</span>
        </div>
        {interview.interviewer && (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">👤</span>
            <span>{interview.interviewer}</span>
          </div>
        )}
        {interview.link && (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">🔗</span>
            <a
              href={interview.link}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-blue-600 underline hover:text-blue-800"
            >
              Join Meeting
            </a>
          </div>
        )}
        {interview.notes && (
          <div className="mt-2 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600">
            {interview.notes}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3">
        <button
          onClick={() => setEditing(true)}
          className="flex-1 rounded-lg border border-zinc-200 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Edit
        </button>
        <button
          onClick={() => { deleteInterview(interview.id); onClose() }}
          className="flex-1 rounded-lg border border-red-100 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
