'use client'

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useStore } from '../_lib/store'
import { JOB_STATUSES, STATUS_LABELS, type JobStatus } from '../_lib/types'
import KanbanColumn from './KanbanColumn'

export default function KanbanBoard() {
  const { data, updateJobStatus } = useStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const jobId = active.id as string
    const newStatus = over.id as JobStatus
    const job = data.jobs.find((j) => j.id === jobId)
    if (job && job.status !== newStatus) {
      updateJobStatus(jobId, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {JOB_STATUSES.map((status) => {
          const jobs = data.jobs.filter((j) => j.status === status)
          return (
            <KanbanColumn
              key={status}
              status={status}
              label={STATUS_LABELS[status]}
              jobs={jobs}
            />
          )
        })}
      </div>
    </DndContext>
  )
}
