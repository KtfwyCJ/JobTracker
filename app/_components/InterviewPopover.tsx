'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'
import { INTERVIEW_TYPE_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, type Interview } from '../_lib/types'
import ScheduleInterviewModal from './ScheduleInterviewModal'

interface Props {
  interview: Interview
  anchorRect: DOMRect
  onClose: () => void
}

export default function InterviewPopover({ interview, anchorRect, onClose }: Props) {
  const { getJob, getCompany, deleteInterview } = useStore()
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  // Position below/above the anchor
  const top = anchorRect.bottom + 8
  const left = Math.min(anchorRect.left, window.innerWidth - 280)

  if (editing) {
    return (
      <ScheduleInterviewModal
        initial={interview}
        onClose={() => { setEditing(false); onClose() }}
      />
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
