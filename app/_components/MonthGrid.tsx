'use client'

import type { Interview, Job } from '../_lib/types'
import InterviewChip from './InterviewChip'
import ApplicationChip from './ApplicationChip'

interface Props {
  year: number
  month: number // 0-indexed
  interviews: Interview[]
  appliedJobs: Job[]
  onDayClick: (date: string) => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function MonthGrid({ year, month, interviews, appliedJobs, onDayClick }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // First day of month
  const firstDay = new Date(year, month, 1)
  // Monday-based: Monday=0 ... Sunday=6
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build flat list of calendar cells (may include leading/trailing days from adj months)
  const cells: Array<{ date: Date; isCurrentMonth: boolean }> = []
  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
    }
  }

  function interviewsForDate(date: Date): Interview[] {
    const iso = date.toISOString().split('T')[0]
    return interviews.filter((i) => i.date === iso)
  }

  function appliedJobsForDate(date: Date): Job[] {
    const iso = date.toISOString().split('T')[0]
    return appliedJobs.filter((j) => j.appliedAt === iso)
  }

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-zinc-200">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((cell, idx) => {
          const isToday = cell.date.getTime() === today.getTime()
          const dayInterviews = interviewsForDate(cell.date)
          const dayApplied = appliedJobsForDate(cell.date)
          const allEvents = [...dayApplied.map(j => ({ kind: 'applied' as const, job: j })), ...dayInterviews.map(i => ({ kind: 'interview' as const, interview: i }))]
          const visible = allEvents.slice(0, 3)
          const overflow = allEvents.length - visible.length
          const isoDate = cell.date.toISOString().split('T')[0]

          return (
            <div
              key={idx}
              className={`min-h-24 border-b border-r border-zinc-100 p-1 last:border-r-0 ${
                !cell.isCurrentMonth ? 'bg-zinc-50' : ''
              }`}
            >
              <div className="mb-1 flex items-center justify-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? 'bg-zinc-900 text-white'
                      : cell.isCurrentMonth
                      ? 'text-zinc-700'
                      : 'text-zinc-300'
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {visible.map((ev, i) =>
                  ev.kind === 'applied' ? (
                    <ApplicationChip key={`a-${ev.job.id}`} job={ev.job} />
                  ) : (
                    <InterviewChip key={`i-${ev.interview.id}`} interview={ev.interview} />
                  )
                )}
                {overflow > 0 && (
                  <button
                    onClick={() => onDayClick(isoDate)}
                    className="rounded px-1 py-0.5 text-left text-xs text-zinc-400 hover:bg-zinc-100"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
