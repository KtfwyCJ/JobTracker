'use client'

import type { Job } from '../_lib/types'
import { useStore } from '../_lib/store'

export default function ApplicationChip({ job }: { job: Job }) {
  const { getCompany } = useStore()
  const company = getCompany(job.companyId)

  return (
    <div className="flex items-center gap-1 truncate rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
      <span className="shrink-0">✉</span>
      <span className="truncate">{company?.name ?? job.title}</span>
    </div>
  )
}
