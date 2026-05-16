'use client'

import { STATUS_COLORS, STATUS_LABELS, type JobStatus } from '../_lib/types'

export default function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
