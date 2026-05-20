'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InterviewTip, QuestionKind } from '../_lib/types'
import { useStore } from '../_lib/store'

interface Props {
  tip: InterviewTip
  onDeleted: () => void
}

export default function TipDetail({ tip, onDeleted }: Props) {
  const router = useRouter()
  const {
    data,
    setSelectedJobId,
    updateInterviewTip,
    deleteInterviewTip,
    addTipQuestion,
    deleteTipQuestion,
    addTipSource,
    deleteTipSource,
    toggleTipItem,
    addTipItem,
    deleteTipItem,
    getCompany,
    getJob,
  } = useStore()

  // Notes auto-save
  const [notes, setNotes] = useState(tip.notes)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveNotes = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        updateInterviewTip(tip.id, { notes: value })
      }, 400)
    },
    [tip.id, updateInterviewTip]
  )

  useEffect(() => {
    setNotes(tip.notes)
  }, [tip.id, tip.notes])

  // Question add row state
  const [qKind, setQKind] = useState<QuestionKind>('text')
  const [qText, setQText] = useState('')
  const [qUrl, setQUrl] = useState('')

  function handleAddQuestion() {
    const t = qText.trim()
    if (!t) return
    addTipQuestion(tip.id, qKind, t, qKind === 'link' ? qUrl.trim() || undefined : undefined)
    setQText('')
    setQUrl('')
  }

  // Source add row state
  const [sLabel, setSLabel] = useState('')
  const [sUrl, setSUrl] = useState('')

  function handleAddSource() {
    const l = sLabel.trim()
    if (!l) return
    addTipSource(tip.id, l, sUrl.trim() || undefined)
    setSLabel('')
    setSUrl('')
  }

  // Checklist add row state
  const [newItem, setNewItem] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)

  function handleAddItem() {
    const t = newItem.trim()
    if (!t) return
    addTipItem(tip.id, t)
    setNewItem('')
    setShowAddItem(false)
  }

  // Linked job navigation
  const linkedJob = tip.linkedJobId ? getJob(tip.linkedJobId) : undefined
  const linkedCompany = linkedJob ? getCompany(linkedJob.companyId) : undefined

  function handleGoToJob() {
    if (!tip.linkedJobId) return
    setSelectedJobId(tip.linkedJobId)
    router.push('/dashboard')
  }

  function handleDelete() {
    deleteInterviewTip(tip.id)
    onDeleted()
  }

  const doneCount = tip.checklist.filter((i) => i.done).length
  const total = tip.checklist.length

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex shrink-0 items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900">{tip.company}</h2>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>{tip.position}</span>
            {linkedJob && (
              <>
                <span>·</span>
                <button
                  onClick={handleGoToJob}
                  className="text-blue-500 hover:underline"
                >
                  {linkedCompany?.name ?? linkedJob.title} ↗
                </button>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {/* Notes */}
      <section className="mb-4">
        <SectionLabel>Notes</SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            saveNotes(e.target.value)
          }}
          rows={3}
          placeholder="Jot down anything useful…"
          className="w-full resize-none rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-zinc-200"
        />
      </section>

      {/* Interview Questions */}
      <section className="mb-4">
        <SectionLabel>Interview Questions</SectionLabel>
        {tip.questions.length > 0 && (
          <div className="mb-2 flex max-h-44 flex-col gap-1 overflow-y-auto">
            {tip.questions.map((q) => (
              <div
                key={q.id}
                className="flex items-start gap-2 rounded-md bg-zinc-50 px-2.5 py-1.5"
              >
                {q.kind === 'link' ? (
                  <span className="mt-0.5 shrink-0 text-[10px] text-blue-500">🔗</span>
                ) : (
                  <span className="mt-0.5 shrink-0 text-[10px] font-semibold text-zinc-400">T</span>
                )}
                <div className="min-w-0 flex-1">
                  {q.kind === 'link' ? (
                    <>
                      <div className="truncate text-xs font-medium text-zinc-900">{q.text}</div>
                      {q.url && (
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-[10px] text-blue-500 underline"
                        >
                          {q.url}
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-zinc-900">{q.text}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteTipQuestion(tip.id, q.id)}
                  className="shrink-0 text-[10px] text-zinc-300 hover:text-zinc-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Add row */}
        <div className="flex items-center gap-1.5">
          <div className="flex overflow-hidden rounded-md border border-zinc-200">
            <button
              onClick={() => setQKind('text')}
              className={`px-2 py-1 text-[10px] font-semibold ${qKind === 'text' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50'}`}
            >
              Text
            </button>
            <button
              onClick={() => setQKind('link')}
              className={`px-2 py-1 text-[10px] font-semibold ${qKind === 'link' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50'}`}
            >
              Link
            </button>
          </div>
          <input
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
            placeholder={qKind === 'text' ? 'Add question…' : 'Label…'}
            className="min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-400"
          />
          {qKind === 'link' && (
            <input
              value={qUrl}
              onChange={(e) => setQUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
              placeholder="URL…"
              className="min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-400"
            />
          )}
          <button
            onClick={handleAddQuestion}
            className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
          >
            Add
          </button>
        </div>
      </section>

      {/* Learning Sources */}
      <section className="mb-4">
        <SectionLabel>Learning Sources</SectionLabel>
        {tip.sources.length > 0 && (
          <div className="mb-2 flex flex-col gap-1">
            {tip.sources.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md bg-zinc-50 px-2.5 py-1.5">
                <span className="shrink-0 text-xs">🔗</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-zinc-900">{s.label}</div>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[10px] text-zinc-500 hover:underline"
                    >
                      {s.url}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => deleteTipSource(tip.id, s.id)}
                  className="shrink-0 text-[10px] text-zinc-300 hover:text-zinc-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            value={sLabel}
            onChange={(e) => setSLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
            placeholder="Label…"
            className="min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-400"
          />
          <input
            value={sUrl}
            onChange={(e) => setSUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
            placeholder="URL or note…"
            className="min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-400"
          />
          <button
            onClick={handleAddSource}
            className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
          >
            Add
          </button>
        </div>
      </section>

      {/* Prep Checklist */}
      <section>
        <div className="mb-1.5 flex items-center gap-2">
          <SectionLabel>Prep Checklist</SectionLabel>
          {total > 0 && (
            <span className={`text-[10px] font-medium ${doneCount === total ? 'text-green-600' : 'text-zinc-400'}`}>
              {doneCount === total ? '✓ All done' : `${doneCount}/${total}`}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {tip.checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${item.done ? 'bg-green-50' : 'bg-zinc-50'}`}
            >
              <button
                onClick={() => toggleTipItem(tip.id, item.id)}
                className={`shrink-0 text-xs ${item.done ? 'text-green-500' : 'text-zinc-300 hover:text-zinc-500'}`}
              >
                {item.done ? '✓' : '○'}
              </button>
              <span
                className={`flex-1 text-xs ${item.done ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}
              >
                {item.text}
              </span>
              <button
                onClick={() => deleteTipItem(tip.id, item.id)}
                className="shrink-0 text-[10px] text-zinc-200 hover:text-zinc-400"
              >
                ✕
              </button>
            </div>
          ))}
          {showAddItem ? (
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddItem()
                  if (e.key === 'Escape') { setShowAddItem(false); setNewItem('') }
                }}
                placeholder="New checklist item…"
                className="min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-400"
              />
              <button
                onClick={handleAddItem}
                className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              className="self-start px-2.5 py-1 text-xs text-blue-500 hover:underline"
            >
              + Add item
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </p>
  )
}
