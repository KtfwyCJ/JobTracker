'use client'

import { useStore } from '../_lib/store'

export default function LearnStatsRow({ today }: { today: string }) {
  const { data, getDailyLog } = useStore()

  const log = getDailyLog(today)
  const doneCount = log?.doneItems.filter((i) => i.done).length ?? 0
  const totalCount = log?.doneItems.length ?? 0

  const inProgressCount = data.learningResources.filter((r) => r.status === 'in_progress').length

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const completedThisMonth = data.learningResources.filter(
    (r) => r.status === 'done' && r.updatedAt >= monthStart
  ).length

  return (
    <div className="flex gap-3">
      <div className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Today</p>
        <p className="mt-0.5 text-xl font-bold">
          {doneCount}
          <span className="ml-1 text-sm font-normal text-zinc-400">/ {totalCount} done</span>
        </p>
      </div>
      <div className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-200">In Progress</p>
        <p className="mt-0.5 text-xl font-bold">
          {inProgressCount}
          <span className="ml-1 text-sm font-normal text-blue-200">resources</span>
        </p>
      </div>
      <div className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Completed</p>
        <p className="mt-0.5 text-xl font-bold">
          {completedThisMonth}
          <span className="ml-1 text-sm font-normal text-zinc-500">this month</span>
        </p>
      </div>
    </div>
  )
}
