'use client'

import { useEffect } from 'react'

interface Props {
  onSelect: (type: 'interview' | 'daily') => void
  onClose: () => void
}

export default function EventTypePicker({ onSelect, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Add Event</h2>
        <div className="flex gap-3">
          <button
            onClick={() => onSelect('interview')}
            className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-zinc-200 p-4 text-center hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
          >
            <span className="text-2xl">💼</span>
            <span className="text-sm font-medium text-zinc-800">Interview</span>
            <span className="text-xs text-zinc-500">Linked to a job application</span>
          </button>
          <button
            onClick={() => onSelect('daily')}
            className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-zinc-200 p-4 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <span className="text-2xl">📅</span>
            <span className="text-sm font-medium text-zinc-800">Daily Event</span>
            <span className="text-xs text-zinc-500">Learning plan, task, or any schedule</span>
          </button>
        </div>
      </div>
    </div>
  )
}
