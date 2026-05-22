'use client'

import { useState } from 'react'
import { useStore } from '../_lib/store'
import MonthGrid from './MonthGrid'
import WeekGrid from './WeekGrid'
import ScheduleInterviewModal from './ScheduleInterviewModal'
import AddDailyEventModal from './AddDailyEventModal'
import EventTypePicker from './EventTypePicker'

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
  const { getInterviewsForMonth, getInterviewsForWeek, getJobsAppliedForMonth, getCalendarEventsForMonth, getCalendarEventsForWeek } = useStore()

  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [showPicker, setShowPicker] = useState(false)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [showDailyModal, setShowDailyModal] = useState(false)
  const [defaultDate, setDefaultDate] = useState<string | undefined>()
  const [defaultTime, setDefaultTime] = useState<string | undefined>()

  // Derive display state
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weekStart = getMonday(currentDate)

  const monthInterviews = getInterviewsForMonth(year, month)
  const weekInterviews = getInterviewsForWeek(weekStart)
  const monthApplied = getJobsAppliedForMonth(year, month)
  const monthCalendarEvents = getCalendarEventsForMonth(year, month)
  const weekCalendarEvents = getCalendarEventsForWeek(weekStart)

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

  function handleDayClick(date: string, time?: string) {
    setDefaultDate(date)
    setDefaultTime(time)
    setShowPicker(true)
  }

  function handlePickerSelect(type: 'interview' | 'daily') {
    setShowPicker(false)
    if (type === 'interview') setShowInterviewModal(true)
    else setShowDailyModal(true)
  }

  function handlePickerClose() {
    setShowPicker(false)
    setDefaultDate(undefined)
    setDefaultTime(undefined)
  }

  function closeInterviewModal() {
    setShowInterviewModal(false)
    setDefaultDate(undefined)
    setDefaultTime(undefined)
  }

  function closeDailyModal() {
    setShowDailyModal(false)
    setDefaultDate(undefined)
    setDefaultTime(undefined)
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
            onClick={() => { setDefaultDate(undefined); setDefaultTime(undefined); setShowPicker(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            <span className="text-base leading-none">+</span>
            Add Event
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
          calendarEvents={monthCalendarEvents}
          onDayClick={handleDayClick}
        />
      ) : (
        <WeekGrid
          weekStart={weekStart}
          interviews={weekInterviews}
          calendarEvents={weekCalendarEvents}
          onDayClick={handleDayClick}
        />
      )}

      {showPicker && (
        <EventTypePicker onSelect={handlePickerSelect} onClose={handlePickerClose} />
      )}
      {showInterviewModal && (
        <ScheduleInterviewModal
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          onClose={closeInterviewModal}
        />
      )}
      {showDailyModal && (
        <AddDailyEventModal
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          onClose={closeDailyModal}
        />
      )}
    </div>
  )
}
