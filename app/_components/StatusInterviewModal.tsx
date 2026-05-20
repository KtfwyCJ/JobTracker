'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'
import { STATUS_LABELS, type JobStatus } from '../_lib/types'

interface Props {
  jobId: string
  status: JobStatus
  onClose: () => void
}

function statusToInterviewType(status: JobStatus) {
  if (status === 'phone_screen') return 'phone_screen' as const
  return 'technical_interview' as const
}

export default function StatusInterviewModal({ jobId, status, onClose }: Props) {
  const { updateJobStatus, addInterview } = useStore()

  const [invitationEmail, setInvitationEmail] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('10:00')
  const [link, setLink] = useState('')
  const [scheduleCall, setScheduleCall] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const note = invitationEmail.trim()
    updateJobStatus(jobId, status, note || undefined)
    if (scheduleCall && date) {
      addInterview({
        jobId,
        type: statusToInterviewType(status),
        date,
        time,
        duration: 60,
        interviewer: '',
        link: link.trim(),
        notes: '',
      })
    }
    onClose()
  }

  function handleSkip() {
    updateJobStatus(jobId, status)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">
          {STATUS_LABELS[status]}
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Paste the invitation email and optionally schedule the call on your calendar.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Invitation Email
              <span className="ml-1 text-xs font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={invitationEmail}
              onChange={(e) => setInvitationEmail(e.target.value)}
              placeholder="Paste the invitation email here…"
              rows={6}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-700 outline-none focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={scheduleCall}
              onChange={(e) => setScheduleCall(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-700">Add to calendar</span>
          </label>

          {scheduleCall && (
            <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    required={scheduleCall}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Meeting Link</label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-600"
            >
              Skip
            </button>
            <div className="flex gap-2">
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
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
