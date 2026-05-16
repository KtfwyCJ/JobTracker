'use client'

import { useRef, useState } from 'react'
import { INTERVIEW_TYPE_LABELS, STATUS_COLORS, type Interview } from '../_lib/types'
import { useStore } from '../_lib/store'
import InterviewPopover from './InterviewPopover'

export default function InterviewBlock({ interview, col }: { interview: Interview; col?: number }) {
  const { getJob, getCompany } = useStore()
  const [popover, setPopover] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLButtonElement>(null)

  const job = getJob(interview.jobId)
  const company = job ? getCompany(job.companyId) : undefined

  const [hour, minute] = interview.time.split(':').map(Number)
  // Grid starts at 08:00. Each 30-min slot = 1 row.
  const rowStart = (hour - 8) * 2 + Math.floor(minute / 30) + 1
  const rowSpan = Math.max(1, interview.duration / 30)

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
        style={{
          gridRow: `${rowStart} / span ${rowSpan}`,
          ...(col !== undefined ? { gridColumn: col } : {}),
        }}
        className={`mx-0.5 overflow-hidden rounded-md border px-2 py-1 text-left text-xs ${STATUS_COLORS[interview.type]} hover:brightness-95`}
      >
        <p className="font-semibold leading-tight truncate">{job?.title}</p>
        {company && <p className="truncate opacity-75">{company.name}</p>}
        {interview.interviewer && (
          <p className="truncate opacity-60">{interview.interviewer}</p>
        )}
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
