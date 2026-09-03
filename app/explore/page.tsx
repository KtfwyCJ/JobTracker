'use client'

import { useState } from 'react'
import DashboardShell from '../_components/DashboardShell'
import AddJobModal from '../_components/AddJobModal'
import CompanyJobExplorer from '../_components/explore/CompanyJobExplorer'
import type { ApplyPrefill } from '../_components/explore/types'

export default function ExplorePage() {
  const [applyPrefill, setApplyPrefill] = useState<ApplyPrefill | null>(null)

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col overflow-hidden">
        <CompanyJobExplorer onApply={setApplyPrefill} />
      </div>

      {applyPrefill && <AddJobModal prefill={applyPrefill} onClose={() => setApplyPrefill(null)} />}
    </DashboardShell>
  )
}
