'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Job, JobStatus } from '../_lib/types'
import { STATUS_DOT_COLORS } from '../_lib/types'
import KanbanCard from './KanbanCard'

interface Props {
  status: JobStatus
  label: string
  jobs: Job[]
}

export default function KanbanColumn({ status, label, jobs }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex w-60 shrink-0 flex-col rounded-xl bg-zinc-100">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status]}`} />
        <span className="text-xs font-semibold text-zinc-600">{label}</span>
        <span className="ml-auto rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl px-2 pb-2 min-h-16 transition-colors ${
          isOver ? 'bg-zinc-200' : ''
        }`}
      >
        {jobs.map((job) => (
          <KanbanCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}
