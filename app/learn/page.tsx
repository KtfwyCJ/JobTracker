'use client'

import DashboardShell from '../_components/DashboardShell'
import LearnStatsRow from '../_components/LearnStatsRow'
import DailyJournal from '../_components/DailyJournal'
import ResourceList from '../_components/ResourceList'

export default function LearnPage() {
  const today = new Date().toISOString().split('T')[0]

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        <LearnStatsRow today={today} />
        <div className="flex flex-1 gap-4 overflow-hidden">
          <div className="w-72 shrink-0 overflow-hidden">
            <DailyJournal today={today} />
          </div>
          <div className="flex flex-1 gap-4 overflow-hidden">
            <ResourceList />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
