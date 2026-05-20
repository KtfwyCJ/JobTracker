'use client'

import { useState } from 'react'
import type { InterviewTip } from '../_lib/types'
import AddTipModal from './AddTipModal'

interface Props {
  tips: InterviewTip[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function TipList({ tips, selectedId, onSelect }: Props) {
  const [showModal, setShowModal] = useState(false)

  function handleCreated(id: string) {
    setShowModal(false)
    onSelect(id)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-3 py-2.5">
        <span className="text-sm font-semibold text-zinc-900">Interview Prep</span>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white hover:bg-zinc-700"
        >
          + Add
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {tips.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-zinc-400">No prep entries yet. Add one above.</p>
        )}
        {tips.map((tip) => {
          const doneCount = tip.checklist.filter((i) => i.done).length
          const total = tip.checklist.length
          const pct = total > 0 ? (doneCount / total) * 100 : 0
          const allDone = total > 0 && doneCount === total
          const isSelected = tip.id === selectedId

          return (
            <button
              key={tip.id}
              onClick={() => onSelect(tip.id)}
              className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                isSelected
                  ? 'border border-blue-400 bg-blue-50'
                  : 'border border-transparent bg-zinc-50 hover:bg-zinc-100'
              }`}
            >
              <div className="text-xs font-bold text-zinc-900">{tip.company}</div>
              <div className="mb-1.5 text-[10px] text-zinc-500">{tip.position}</div>
              <div className="flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-green-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[9px] font-medium ${allDone ? 'text-green-600' : 'text-zinc-400'}`}>
                  {allDone ? '✓' : `${doneCount}/${total}`}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {showModal && (
        <AddTipModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
