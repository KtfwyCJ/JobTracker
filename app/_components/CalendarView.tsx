'use client'

import { useState } from 'react'
import { useStore } from '../_lib/store'
import MonthGrid from './MonthGrid'
import WeekGrid from './WeekGrid'
import ScheduleInterviewModal from './ScheduleInterviewModal'

type ViewMode = 'month' | 'week'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarView() {
  const { getInterviewsForMonth, getInterviewsForWeek, getJobsAppliedForMonth } = useStore()

  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [showModal, setShowModal] = useState(false)
  const [defaultDate, setDefaultDate] = useState<string | undefined>()

  // Derive display state
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weekStart = getMonday(currentDate)

  const monthInterviews = getInterviewsForMonth(year, month)
  const weekInterviews = getInterviewsForWeek(weekStart)
  const monthApplied = getJobsAppliedForMonth(year, month)

  function navigate(dir: 1 | -1) {
    if (view === 'month') {
      setCurrentDate(new Date(year, month + dir, 1))
    } else {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + dir * 7)
      setCurrentDate(d)
    }
  }

  function headerLabel() {
    if (view === 'month') return `${MONTH_NAMES[month]} ${year}`
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const startFmt = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endFmt = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startFmt} – ${endFmt}`
  }

  function handleDayClick(date: string) {
    setDefaultDate(date)
    setShowModal(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100"
          aria-label="Previous"
        >
          ◀
        </button>
        <h2 className="min-w-48 text-center text-base font-semibold text-zinc-800">
          {headerLabel()}
        </h2>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100"
          aria-label="Next"
        >
          ▶
        </button>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === 'month' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`border-l border-zinc-200 px-3 py-1.5 text-sm font-medium transition-colors ${
                view === 'week' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              Week
            </button>
          </div>

          <button
            onClick={() => { setDefaultDate(undefined); setShowModal(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <span className="text-base leading-none">+</span>
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Calendar */}
      {view === 'month' ? (
        <MonthGrid
          year={year}
          month={month}
          interviews={monthInterviews}
          appliedJobs={monthApplied}
          onDayClick={handleDayClick}
        />
      ) : (
        <WeekGrid weekStart={weekStart} interviews={weekInterviews} />
      )}

      {showModal && (
        <ScheduleInterviewModal
          defaultDate={defaultDate}
          onClose={() => { setShowModal(false); setDefaultDate(undefined) }}
        />
      )}
    </div>
  )
}
