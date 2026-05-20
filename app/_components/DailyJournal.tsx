'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'
import type { DailyLogItem } from '../_lib/types'

function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setText('')
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="Add item..."
        className="flex-1 rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200"
      />
      <button
        onClick={submit}
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700"
      >
        Add
      </button>
    </div>
  )
}

function LogItemRow({
  item,
  showToggle,
  onToggle,
  onDelete,
}: {
  item: DailyLogItem
  showToggle: boolean
  onToggle?: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex items-center gap-2 rounded-md bg-zinc-50 px-2.5 py-1.5">
      {showToggle ? (
        <button
          onClick={onToggle}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
            item.done
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-zinc-300 text-transparent hover:border-zinc-400'
          }`}
        >
          ✓
        </button>
      ) : (
        <span className="shrink-0 text-zinc-400 text-sm">→</span>
      )}
      <span className={`flex-1 text-sm ${item.done ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
        {item.text}
      </span>
      <button
        onClick={onDelete}
        className="hidden text-zinc-300 hover:text-red-400 group-hover:block text-xs"
      >
        ✕
      </button>
    </div>
  )
}

export default function DailyJournal({ today }: { today: string }) {
  const { getDailyLog, upsertDailyLog, addLogItem, toggleLogItem, deleteLogItem } = useStore()

  useEffect(() => {
    upsertDailyLog(today)
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps

  const log = getDailyLog(today)

  const formattedDate = new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Today — {formattedDate}</h2>
      </div>

      <section className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">What I did</p>
        {log?.doneItems.map((item) => (
          <LogItemRow
            key={item.id}
            item={item}
            showToggle
            onToggle={() => toggleLogItem(today, 'done', item.id)}
            onDelete={() => deleteLogItem(today, 'done', item.id)}
          />
        ))}
        <AddItemRow onAdd={(text) => addLogItem(today, 'done', text)} />
      </section>

      <section className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Plan for tomorrow</p>
        {log?.planItems.map((item) => (
          <LogItemRow
            key={item.id}
            item={item}
            showToggle={false}
            onDelete={() => deleteLogItem(today, 'plan', item.id)}
          />
        ))}
        <AddItemRow onAdd={(text) => addLogItem(today, 'plan', text)} />
      </section>
    </div>
  )
}
