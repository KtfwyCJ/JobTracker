'use client'

import type { CalendarEvent, Interview } from '../_lib/types'
import InterviewBlock from './InterviewBlock'
import CalendarEventBlock from './CalendarEventBlock'

interface Props {
  weekStart: Date // Monday of the week
  interviews: Interview[]
  calendarEvents: CalendarEvent[]
  onDayClick: (date: string, time: string) => void
}

const HOUR_START = 8
const HOUR_END = 20
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * 2 // 30-min slots

function formatHour(h: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12} ${ampm}`
}

export default function WeekGrid({ weekStart, interviews, calendarEvents, onDayClick }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  function localIso(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function slotToTime(slot: number) {
    const hour = HOUR_START + Math.floor(slot / 2)
    const minute = (slot % 2) * 30
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  function interviewsForDay(date: Date): Interview[] {
    const iso = localIso(date)
    return interviews.filter((i) => i.date === iso)
  }

  function calendarEventsForDay(date: Date): CalendarEvent[] {
    const iso = localIso(date)
    return calendarEvents.filter((e) => e.date === iso)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {/* Day header row */}
      <div className="grid border-b border-zinc-200" style={{ gridTemplateColumns: '3.5rem repeat(7, 1fr)' }}>
        <div className="border-r border-zinc-200" />
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime()
          return (
            <div key={i} className="border-r border-zinc-200 py-2 text-center last:border-r-0">
              <p className="text-xs text-zinc-500">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p
                className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? 'bg-zinc-900 text-white' : 'text-zinc-800'
                }`}
              >
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '3.5rem repeat(7, 1fr)',
            gridTemplateRows: `repeat(${TOTAL_SLOTS}, 2rem)`,
          }}
        >
          {/* Time labels (col 1) */}
          {Array.from({ length: TOTAL_SLOTS }).map((_, slot) => {
            const hour = HOUR_START + Math.floor(slot / 2)
            const isHalfHour = slot % 2 === 1
            return (
              <div
                key={`time-${slot}`}
                style={{ gridRow: slot + 1, gridColumn: 1 }}
                className="border-r border-zinc-100 pr-2 text-right"
              >
                {!isHalfHour && (
                  <span className="text-[10px] leading-8 text-zinc-400">{formatHour(hour)}</span>
                )}
              </div>
            )
          })}

          {/* Hour divider lines (cols 2-8) — clickable to schedule */}
          {Array.from({ length: TOTAL_SLOTS }).map((_, slot) => (
            Array.from({ length: 7 }).map((__, col) => (
              <div
                key={`grid-${slot}-${col}`}
                onClick={() => onDayClick(localIso(days[col]), slotToTime(slot))}
                style={{ gridRow: slot + 1, gridColumn: col + 2 }}
                className={`cursor-pointer border-r border-zinc-100 last:border-r-0 hover:bg-blue-50/40 ${
                  slot % 2 === 0 ? 'border-t border-zinc-200' : 'border-t border-zinc-100'
                }`}
              />
            ))
          ))}

          {/* Interview blocks — direct grid children with both gridRow and gridColumn set */}
          {days.map((day, colIdx) =>
            interviewsForDay(day).map((interview) => {
              const [hour] = interview.time.split(':').map(Number)
              if (hour < HOUR_START || hour >= HOUR_END) return null
              return (
                <InterviewBlock key={interview.id} interview={interview} col={colIdx + 2} />
              )
            })
          )}

          {/* Calendar event blocks */}
          {days.map((day, colIdx) =>
            calendarEventsForDay(day).map((event) => {
              const [hour] = event.time.split(':').map(Number)
              if (hour < HOUR_START || hour >= HOUR_END) return null
              return (
                <CalendarEventBlock key={event.id} event={event} col={colIdx + 2} />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
