'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../_lib/store'
import type { Job, TechnicalQuestion } from '../_lib/types'

type DrawerState = 'entry' | 'loading' | 'results'
type QuestionCount = 10 | 20 | 30 | 50

const COUNT_OPTIONS: { value: QuestionCount; label: string }[] = [
  { value: 10, label: '10 · Quick' },
  { value: 20, label: '20 · Default' },
  { value: 30, label: '30 · Deep' },
  { value: 50, label: '50 · Thorough' },
]

const LIKELIHOOD_COLORS: Record<TechnicalQuestion['likelihood'], string> = {
  high: '#16a34a',
  medium: '#ca8a04',
  low: '#d4d4d8',
}

export default function TechnicalQuestionsDrawer({
  job,
  onClose,
}: {
  job: Job
  onClose: () => void
}) {
  const { updateTechnicalQuestions } = useStore()

  const hasSaved = !!(job.technicalQuestions && job.technicalQuestions.length > 0)

  const [state, setState] = useState<DrawerState>(hasSaved ? 'results' : 'entry')
  const [linkedinUrl, setLinkedinUrl] = useState(job.interviewerLinkedIn ?? '')
  const [questionCount, setQuestionCount] = useState<QuestionCount>(20)
  const [questions, setQuestions] = useState<TechnicalQuestion[]>(job.technicalQuestions ?? [])
  const [linkedinFetched, setLinkedinFetched] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set())
  const [answersLoading, setAnswersLoading] = useState(false)
  const [answersError, setAnswersError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [panelWidth, setPanelWidth] = useState(320)
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null)

  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startWidth: panelWidth }
  }, [panelWidth])

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    const delta = dragState.current.startX - e.clientX
    setPanelWidth(Math.min(640, Math.max(256, dragState.current.startWidth + delta)))
  }, [])

  const onDragEnd = useCallback(() => {
    dragState.current = null
  }, [])

  const saved = hasSaved && questions === job.technicalQuestions
  const allHaveAnswers = questions.length > 0 && questions.every((q) => q.answer)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (state === 'entry') inputRef.current?.focus()
  }, [state])

  function toggleAnswer(index: number) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  async function handleGenerate() {
    if (!linkedinUrl.trim()) return
    setError(null)
    setState('loading')

    try {
      const res = await fetch('/api/technical-questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedinUrl: linkedinUrl.trim(),
          jobDescription: job.description,
          jobLink: job.jobLink,
          count: questionCount,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Generation failed.')
        setState('entry')
        return
      }

      setQuestions(json.questions)
      setLinkedinFetched(json.linkedinFetched)
      setExpandedAnswers(new Set())
      setState('results')
    } catch {
      setError('Network error. Please try again.')
      setState('entry')
    }
  }

  async function handleGenerateAnswers() {
    setAnswersError(null)
    setAnswersLoading(true)

    try {
      const res = await fetch('/api/technical-questions/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questions.map((q) => q.question) }),
      })

      const json = await res.json()

      if (!res.ok) {
        setAnswersError(json.error ?? 'Failed to generate answers.')
        setAnswersLoading(false)
        return
      }

      const answerMap = new Map<string, string>(
        (json.answers as { question: string; answer: string }[]).map((a) => [a.question, a.answer])
      )

      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          answer: answerMap.get(q.question) ?? q.answer,
        }))
      )
    } catch {
      setAnswersError('Network error. Please try again.')
    } finally {
      setAnswersLoading(false)
    }
  }

  function handleSave() {
    updateTechnicalQuestions(job.id, linkedinUrl.trim(), questions)
  }

  function handleRegenerate() {
    setState('entry')
  }

  return (
    <div
      className="relative flex shrink-0 flex-col border-l border-zinc-200 bg-white"
      style={{ width: panelWidth }}
    >
      {/* Drag handle — sits centered on the left border */}
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        className="absolute inset-y-0 -left-1 w-2 cursor-col-resize select-none z-10 hover:bg-zinc-300/40 active:bg-zinc-400/40 transition-colors"
      />
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-900">Technical Questions</span>
        <div className="flex items-center gap-2">
          {state === 'results' && (
            <button
              onClick={handleRegenerate}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              ↺ Regenerate
            </button>
          )}
          <button
            onClick={onClose}
            className="text-lg leading-none text-zinc-300 hover:text-zinc-500 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4 gap-4">

        {/* Entry state */}
        {state === 'entry' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Interviewer's LinkedIn URL
              </label>
              <input
                ref={inputRef}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500">
                Number of Questions
              </label>
              <div className="flex flex-wrap gap-2">
                {COUNT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setQuestionCount(value)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      questionCount === value
                        ? 'border-2 border-zinc-900 font-semibold text-zinc-900'
                        : 'border border-zinc-200 text-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleGenerate}
              disabled={!linkedinUrl.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
            >
              Generate Questions
            </button>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Questions are generated based on the interviewer's LinkedIn profile, your CV, and this job's description.
            </p>
          </>
        )}

        {/* Loading state */}
        {state === 'loading' && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Interviewer's LinkedIn URL
              </label>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 truncate">
                {linkedinUrl}
              </div>
            </div>
            <button
              disabled
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-400 cursor-not-allowed"
            >
              Generating…
            </button>
            <div className="flex flex-col gap-2 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-zinc-100 animate-pulse"
                  style={{ width: `${70 + (i % 3) * 10}%` }}
                />
              ))}
            </div>
          </>
        )}

        {/* Results state */}
        {state === 'results' && (
          <>
            <div>
              <p className="text-xs text-zinc-400 truncate">{linkedinUrl}</p>
            </div>

            {!linkedinFetched && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 leading-relaxed">
                ⚠ LinkedIn profile couldn't be fetched. Questions are based on your CV and job description only.
              </div>
            )}

            {/* Generate All Answers button */}
            {!allHaveAnswers && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleGenerateAnswers}
                  disabled={answersLoading}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {answersLoading ? 'Generating answers…' : '✦ Generate All Answers'}
                </button>
                {answersError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {answersError}
                  </p>
                )}
              </div>
            )}

            {/* Question list */}
            <ol className="flex flex-col gap-2">
              {questions.map((q, i) => (
                <li
                  key={i}
                  onClick={() => q.answer && toggleAnswer(i)}
                  className={`overflow-hidden rounded-lg border border-zinc-200 ${q.answer ? 'cursor-pointer hover:border-zinc-300 hover:bg-zinc-50' : ''} transition-colors`}
                >
                  <div className="flex">
                    {/* Likelihood color bar */}
                    <div
                      className="w-1 shrink-0"
                      style={{ backgroundColor: LIKELIHOOD_COLORS[q.likelihood] }}
                    />
                    <div className="flex-1 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 shrink-0 text-right text-xs font-medium text-zinc-400 tabular-nums">
                          {i + 1}.
                        </span>
                        <span className="flex-1 text-sm text-zinc-700 leading-relaxed">{q.question}</span>
                        {q.answer && (
                          <span className="shrink-0 text-xs text-zinc-400 pt-0.5">
                            {expandedAnswers.has(i) ? '▴' : '▾'}
                          </span>
                        )}
                      </div>
                      {q.answer && expandedAnswers.has(i) && (
                        <div className="mt-2 border-t border-zinc-100 pt-2 text-xs text-zinc-500 leading-relaxed">
                          {q.answer}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex items-center gap-2 pt-2 pb-1">
              <button
                onClick={handleSave}
                disabled={saved}
                className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                {saved ? 'Saved ✓' : 'Save to Job'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
