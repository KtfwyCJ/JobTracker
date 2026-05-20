'use client'

import { useRef } from 'react'
import DashboardShell from '../_components/DashboardShell'
import PlanToc from '../_components/PlanToc'
import PlanEditor from '../_components/PlanEditor'
import { useStore } from '../_lib/store'

export default function PlanPage() {
  const { data } = useStore()
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <DashboardShell>
      <div className="flex h-full w-full flex-1 overflow-hidden bg-white">
        <div className="w-56 shrink-0 border-r border-zinc-200">
          <PlanToc content={data.planDocument} contentRef={contentRef} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PlanEditor content={data.planDocument} contentRef={contentRef} />
        </div>
      </div>
    </DashboardShell>
  )
}
