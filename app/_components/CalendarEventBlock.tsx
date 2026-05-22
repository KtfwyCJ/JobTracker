'use client'

import type { CalendarEvent } from '../_lib/types'

const HOUR_START = 8

export default function CalendarEventBlock({ event, col }: { event: CalendarEvent; col?: number }) {
  const [hour, minute] = event.time.split(':').map(Number)
  const rowStart = (hour - HOUR_START) * 2 + Math.floor(minute / 30) + 1
  const rowSpan = Math.max(1, event.duration / 30)

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        gridRow: `${rowStart} / span ${rowSpan}`,
        ...(col !== undefined ? { gridColumn: col } : {}),
      }}
      className="mx-0.5 overflow-hidden rounded-md border border-indigo-300 bg-indigo-100 px-2 py-1 text-xs text-indigo-800"
    >
      <p className="font-semibold leading-tight truncate">{event.title}</p>
      {event.description && (
        <p className="truncate opacity-70">{event.description}</p>
      )}
    </div>
  )
}
