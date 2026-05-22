'use client'

import type { CalendarEvent } from '../_lib/types'

export default function CalendarEventChip({ event }: { event: CalendarEvent }) {
  const [hour, minute] = event.time.split(':').map(Number)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  const timeLabel = `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex w-full items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700"
    >
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
      <span className="truncate font-medium">{event.title}</span>
      <span className="ml-auto shrink-0 opacity-70">{timeLabel}</span>
    </div>
  )
}
