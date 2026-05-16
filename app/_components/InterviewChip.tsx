'use client'

import { useRef, useState } from 'react'
import { INTERVIEW_TYPE_LABELS, STATUS_DOT_COLORS, type Interview } from '../_lib/types'
import { useStore } from '../_lib/store'
import InterviewPopover from './InterviewPopover'

export default function InterviewChip({ interview }: { interview: Interview }) {
  const { getJob, getCompany } = useStore()
  const [popover, setPopover] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLButtonElement>(null)

  const job = getJob(interview.jobId)
  const company = job ? getCompany(job.companyId) : undefined

  const [hour, minute] = interview.time.split(':').map(Number)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  const timeLabel = `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    const rect = ref.current?.getBoundingClientRect()
    setPopover(rect ?? null)
  }

  return (
    <>
      <button
        ref={ref}
        onClick={handleClick}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:bg-zinc-100"
      >
        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_COLORS[interview.type]}`} />
        <span className="truncate font-medium text-zinc-700">{company?.name}</span>
        <span className="ml-auto shrink-0 text-zinc-400">{timeLabel}</span>
      </button>
      {popover && (
        <InterviewPopover
          interview={interview}
          anchorRect={popover}
          onClose={() => setPopover(null)}
        />
      )}
    </>
  )
}
