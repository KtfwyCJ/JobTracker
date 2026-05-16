'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Job } from '../_lib/types'
import { useStore } from '../_lib/store'

export default function KanbanCard({ job }: { job: Job }) {
  const { getCompany, data } = useStore()
  const company = getCompany(job.companyId)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const today = new Date().toISOString().split('T')[0]
  const nextInterview = data.interviews
    .filter((i) => i.jobId === job.id && i.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0]

  const appliedLabel = new Date(job.appliedAt + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg bg-white px-3 py-2.5 shadow-sm cursor-grab select-none transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <p className="text-sm font-medium text-zinc-800 leading-snug">{job.title}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{company?.name}</p>
      {job.location && <p className="mt-0.5 text-xs text-zinc-400">{job.location}</p>}
      {job.requiresGerman && (
        <span className="mt-1 inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
          DE
        </span>
      )}
      <p className="mt-1 text-xs text-zinc-400">Applied {appliedLabel}</p>
      {nextInterview && (
        <p className="mt-0.5 text-xs text-zinc-400">
          Interview:{' '}
          {new Date(nextInterview.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      )}
    </div>
  )
}
