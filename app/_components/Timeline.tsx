'use client'

import { useState } from 'react'
import { useStore } from '../_lib/store'
import type { TimelineEvent } from '../_lib/types'

function EventRow({ evt }: { evt: TimelineEvent }) {
  const { updateTimelineEvent, deleteTimelineEvent } = useStore()
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view')
  const [editTitle, setEditTitle] = useState(evt.title)
  const [editDate, setEditDate] = useState(evt.eventDate)
  const [editNote, setEditNote] = useState(evt.note)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim()) return
    updateTimelineEvent(evt.id, editTitle.trim(), editNote.trim(), editDate)
    setMode('view')
  }

  function handleCancelEdit() {
    setEditTitle(evt.title)
    setEditDate(evt.eventDate)
    setEditNote(evt.note)
    setMode('view')
  }

  if (mode === 'edit') {
    return (
      <li className="ml-4">
        <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-zinc-300" />
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Event title"
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
            required
          />
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
          />
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="group ml-4">
      <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-zinc-400" />
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium text-zinc-800">{evt.title}</p>
          <time className="text-xs text-zinc-400">
            {new Date(evt.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </div>
        {mode === 'confirmDelete' ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            Delete?
            <button
              onClick={() => deleteTimelineEvent(evt.id)}
              className="font-medium text-red-600 hover:text-red-700"
            >
              Confirm
            </button>
            <span className="text-zinc-300">·</span>
            <button onClick={() => setMode('view')} className="hover:text-zinc-600">
              Cancel
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setMode('edit')}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              Edit
            </button>
            <button
              onClick={() => setMode('confirmDelete')}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
            >
              Delete
            </button>
          </span>
        )}
      </div>
      {evt.note && <p className="mt-0.5 text-sm text-zinc-500">{evt.note}</p>}
    </li>
  )
}

export default function Timeline({ jobId }: { jobId: string }) {
  const { getJobEvents, addTimelineEvent } = useStore()
  const events = getJobEvents(jobId)

  const [adding, setAdding] = useState(false)
  const [evtTitle, setEvtTitle] = useState('')
  const [evtDate, setEvtDate] = useState(new Date().toISOString().split('T')[0])
  const [evtNote, setEvtNote] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!evtTitle.trim()) return
    addTimelineEvent(jobId, evtTitle.trim(), evtNote.trim(), evtDate)
    setEvtTitle('')
    setEvtNote('')
    setEvtDate(new Date().toISOString().split('T')[0])
    setAdding(false)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">Timeline</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            + Add Event
          </button>
        )}
      </div>

      <ol className="relative ml-2 border-l border-zinc-200 space-y-4">
        {events.map((evt) => (
          <EventRow key={evt.id} evt={evt} />
        ))}

        {adding && (
          <li className="ml-4">
            <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-zinc-300" />
            <form onSubmit={handleAdd} className="flex flex-col gap-2">
              <input
                autoFocus
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                placeholder="Event title"
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
                required
              />
              <input
                type="date"
                value={evtDate}
                onChange={(e) => setEvtDate(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
              />
              <textarea
                value={evtNote}
                onChange={(e) => setEvtNote(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </li>
        )}
      </ol>

      {events.length === 0 && !adding && (
        <p className="mt-2 text-sm text-zinc-400">No events yet.</p>
      )}
    </div>
  )
}
