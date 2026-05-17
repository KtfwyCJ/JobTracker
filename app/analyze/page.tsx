'use client'

import { useRef, useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import DashboardShell from '../_components/DashboardShell'
import AddJobModal from '../_components/AddJobModal'

type StepStatus = 'idle' | 'running' | 'done' | 'error'

interface Step {
  id: string
  label: string
  status: StepStatus
  preview: string
  error: string
}

interface ExtractResult { text: string; wordCount: number }
interface StructureResult { title?: string; company?: string; level?: string; location?: string; skills?: string[]; requirements?: string[]; niceToHave?: string[] }
interface MatchResult { strengths?: string[]; gaps?: string[]; summary?: string }
interface GapsResult { hardGaps?: string[]; softGaps?: string[]; score?: number; verdict?: string }
interface CoverLetterResult { coverLetter: string }
interface Suggestion { gap: string; bullet: string }
interface SuggestionsResult { suggestions: Suggestion[] }

const INITIAL_STEPS: Step[] = [
  { id: 'extract', label: 'JD Extractor', status: 'idle', preview: '', error: '' },
  { id: 'structure', label: 'JD Structurer', status: 'idle', preview: '', error: '' },
  { id: 'match', label: 'CV Matcher', status: 'idle', preview: '', error: '' },
  { id: 'gaps', label: 'Gap Analyzer', status: 'idle', preview: '', error: '' },
  { id: 'coverLetter', label: 'Cover Letter Generator', status: 'idle', preview: '', error: '' },
]

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === 'done') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-[11px] text-white">
        ✓
      </span>
    )
  }
  if (status === 'running') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-white" />
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] text-white">
        ✕
      </span>
    )
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-semibold text-zinc-500">
      {index + 1}
    </span>
  )
}

function ScoreCard({ score, verdict }: { score: number; verdict: string }) {
  const pct = Math.round((score / 10) * 100)
  const color = score >= 7 ? 'text-green-600' : score >= 4 ? 'text-amber-600' : 'text-red-600'
  const barColor = score >= 7 ? 'bg-green-400' : score >= 4 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-4xl font-extrabold leading-none text-zinc-900">
        {score}
        <span className="text-xl font-medium text-zinc-400">/10</span>
      </div>
      <div className="flex-1">
        <p className="mb-1.5 text-xs font-semibold text-zinc-500">Match Score</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-1.5 text-xs font-semibold ${color}`}>{verdict}</p>
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  const [url, setUrl] = useState('')
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [running, setRunning] = useState(false)
  const [gapsResult, setGapsResult] = useState<GapsResult | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [retryFromIndex, setRetryFromIndex] = useState<number | null>(null)
  const [showAppliedModal, setShowAppliedModal] = useState(false)
  const [suggestionsResult, setSuggestionsResult] = useState<Suggestion[] | null>(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')
  const [suggestionsCopied, setSuggestionsCopied] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Stored intermediate results for retry
  const [extractRes, setExtractRes] = useState<ExtractResult | null>(null)
  const [structureRes, setStructureRes] = useState<StructureResult | null>(null)
  const [matchRes, setMatchRes] = useState<MatchResult | null>(null)

  function updateStep(id: string, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  async function callStage<T>(
    stepId: string,
    route: string,
    body: object,
  ): Promise<T | null> {
    updateStep(stepId, { status: 'running', error: '' })
    try {
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        updateStep(stepId, { status: 'error', error: data.error ?? 'Request failed' })
        return null
      }
      return data as T
    } catch (e) {
      updateStep(stepId, { status: 'error', error: e instanceof Error ? e.message : 'Network error' })
      return null
    }
  }

  async function runPipeline(startFrom = 0) {
    if (!url.trim()) return
    setRunning(true)
    setRetryFromIndex(null)

    // Reset steps from startFrom onwards
    setSteps((prev) =>
      prev.map((s, i) => (i >= startFrom ? { ...s, status: 'idle', preview: '', error: '' } : s))
    )
    if (startFrom === 0) {
      setGapsResult(null)
      setCoverLetter('')
      setExtractRes(null)
      setStructureRes(null)
      setMatchRes(null)
    }
    if (startFrom <= 3) {
      setSuggestionsResult(null)
      setSuggestionsError('')
    }

    let extract = startFrom === 0 ? null : extractRes
    let structure = startFrom <= 1 ? null : structureRes
    let match = startFrom <= 2 ? null : matchRes

    // Stage 1: Extract
    if (startFrom <= 0) {
      extract = await callStage<ExtractResult>('extract', '/api/jd/extract', { url })
      if (!extract) { setRunning(false); setRetryFromIndex(0); return }
      setExtractRes(extract)
      updateStep('extract', {
        status: 'done',
        preview: `${extract.wordCount.toLocaleString()} words fetched`,
      })
    }

    // Stage 2: Structure
    if (startFrom <= 1) {
      structure = await callStage<StructureResult>('structure', '/api/jd/structure', { text: extract!.text })
      if (!structure) { setRunning(false); setRetryFromIndex(1); return }
      setStructureRes(structure)
      const preview = [structure.title, structure.company, structure.level].filter(Boolean).join(' · ')
      updateStep('structure', { status: 'done', preview })
    }

    // Stage 3: CV Match
    if (startFrom <= 2) {
      match = await callStage<MatchResult>('match', '/api/cv/match', { jd: structure })
      if (!match) { setRunning(false); setRetryFromIndex(2); return }
      setMatchRes(match)
      const preview = (match.strengths ?? []).slice(0, 2).join(', ')
      updateStep('match', { status: 'done', preview: preview || (match.summary ?? '') })
    }

    // Stage 4: Gap Analysis
    const gaps = await callStage<GapsResult>('gaps', '/api/cv/gaps', { jd: structure, match })
    if (!gaps) { setRunning(false); setRetryFromIndex(3); return }
    setGapsResult(gaps)
    updateStep('gaps', {
      status: 'done',
      preview: `Score ${gaps.score}/10 · ${gaps.verdict ?? ''}`,
    })

    // Stage 5: Cover Letter
    const clResult = await callStage<CoverLetterResult>(
      'coverLetter',
      '/api/cover-letter/generate',
      { jd: structure, match, gaps },
    )
    if (!clResult) { setRunning(false); setRetryFromIndex(4); return }
    setCoverLetter(clResult.coverLetter)
    updateStep('coverLetter', {
      status: 'done',
      preview: `${clResult.coverLetter.split(/\s+/).length} words generated`,
    })

    setRunning(false)
  }

  function handleClear() {
    setUrl('')
    setSteps(INITIAL_STEPS)
    setGapsResult(null)
    setCoverLetter('')
    setRetryFromIndex(null)
    setExtractRes(null)
    setStructureRes(null)
    setMatchRes(null)
    setSuggestionsResult(null)
    setSuggestionsError('')
  }

  function buildAnalysisText(): string {
    const lines: string[] = []
    if (gapsResult?.score !== undefined) {
      lines.push(`Match: ${gapsResult.score}/10 — ${gapsResult.verdict ?? ''}`)
    }
    if (matchRes?.strengths?.length) {
      lines.push('')
      lines.push('Strengths:')
      matchRes.strengths.forEach((s) => lines.push(`• ${s}`))
    }
    if (gapsResult?.hardGaps?.length) {
      lines.push('')
      lines.push('Hard Gaps:')
      gapsResult.hardGaps.forEach((g) => lines.push(`• ${g}`))
    }
    if (gapsResult?.softGaps?.length) {
      lines.push('')
      lines.push('Soft Gaps:')
      gapsResult.softGaps.forEach((g) => lines.push(`• ${g}`))
    }
    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleGetSuggestions() {
    if (!structureRes || !gapsResult || suggestionsLoading) return
    setSuggestionsLoading(true)
    setSuggestionsError('')
    setSuggestionsResult(null)
    try {
      const res = await fetch('/api/cv/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd: structureRes, gaps: gapsResult }),
      })
      const data: SuggestionsResult & { error?: string } = await res.json()
      if (!res.ok || data.error) {
        setSuggestionsError(data.error ?? 'Request failed')
      } else {
        setSuggestionsResult(data.suggestions)
      }
    } catch (e) {
      setSuggestionsError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSuggestionsLoading(false)
    }
  }

  function handleCopySuggestions() {
    if (!suggestionsResult) return
    const text = suggestionsResult
      .map((s) => `Gap: ${s.gap}\n→ ${s.bullet}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    setSuggestionsCopied(true)
    setTimeout(() => setSuggestionsCopied(false), 2000)
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const title = structureRes?.title
      pdf.save(title ? `Cover Letter(${title}).pdf` : 'Cover Letter.pdf')
    } finally {
      setDownloading(false)
    }
  }

  const anyStarted = steps.some((s) => s.status !== 'idle')

  return (
    <DashboardShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="text-xl font-semibold text-zinc-900">Analyze a Job</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Paste a job posting URL to extract, match against your CV, and generate a cover letter.
          </p>

          {/* URL input */}
          <div className="mt-6 flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !running && runPipeline(0)}
              placeholder="https://jobs.lever.co/..."
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              disabled={running}
            />
            <button
              onClick={() => runPipeline(0)}
              disabled={running || !url.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? 'Running…' : 'Analyze'}
            </button>
            {anyStarted && !running && (
              <button
                onClick={handleClear}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Pipeline steps */}
          {anyStarted && (
            <div className="mt-6 flex flex-col gap-2">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    step.status === 'done'
                      ? 'border-green-200 bg-green-50'
                      : step.status === 'running'
                        ? 'border-blue-200 bg-blue-50'
                        : step.status === 'error'
                          ? 'border-red-200 bg-red-50'
                          : 'border-zinc-100 bg-white'
                  }`}
                >
                  <StepIcon status={step.status} index={i} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${step.status === 'idle' ? 'text-zinc-400' : 'text-zinc-900'}`}>
                      {step.label}
                    </p>
                    {step.preview && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{step.preview}</p>
                    )}
                    {step.error && (
                      <p className="mt-0.5 text-xs text-red-600">{step.error}</p>
                    )}
                  </div>
                  {step.status === 'error' && retryFromIndex === i && (
                    <button
                      onClick={() => runPipeline(i)}
                      className="shrink-0 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Score card */}
          {gapsResult?.score !== undefined && (
            <div className="mt-6">
              <ScoreCard score={gapsResult.score} verdict={gapsResult.verdict ?? ''} />
              {(gapsResult.hardGaps?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold text-zinc-700">Gaps to address</p>
                  <ul className="space-y-1">
                    {gapsResult.hardGaps!.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                        <span className="mt-0.5 text-red-400">●</span>{g}
                      </li>
                    ))}
                    {(gapsResult.softGaps ?? []).map((g, i) => (
                      <li key={`soft-${i}`} className="flex items-start gap-2 text-xs text-zinc-500">
                        <span className="mt-0.5 text-zinc-300">●</span>{g}
                      </li>
                    ))}
                  </ul>

                  {/* CV Suggestions */}
                  {!running && (
                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      {!suggestionsResult && (
                        <>
                          <button
                            onClick={handleGetSuggestions}
                            disabled={suggestionsLoading}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {suggestionsLoading ? 'Generating…' : 'Get CV Suggestions'}
                          </button>
                          {suggestionsError && (
                            <p className="mt-1.5 text-xs text-red-600">
                              {suggestionsError}{' '}
                              <button
                                onClick={handleGetSuggestions}
                                disabled={suggestionsLoading}
                                className="underline hover:text-red-800 disabled:opacity-50"
                              >
                                Retry
                              </button>
                            </p>
                          )}
                        </>
                      )}

                      {suggestionsResult && (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-zinc-700">CV Suggestions</p>
                            <button
                              onClick={handleCopySuggestions}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                suggestionsCopied
                                  ? 'bg-green-500 text-white'
                                  : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                              }`}
                            >
                              {suggestionsCopied ? 'Copied!' : 'Copy all'}
                            </button>
                          </div>
                          <ul className="space-y-3">
                            {suggestionsResult.map((s, i) => (
                              <li key={i} className="text-xs">
                                <p className="font-medium text-zinc-500">Gap: {s.gap}</p>
                                <p className="mt-0.5 text-zinc-700">→ {s.bullet}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mark as Applied */}
          {structureRes && !running && (
            <div className="mt-4">
              <button
                onClick={() => setShowAppliedModal(true)}
                className="w-full rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
              >
                Mark as Applied
              </button>
            </div>
          )}

          {/* Cover letter */}
          {coverLetter && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">Cover Letter</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {downloading ? 'Generating…' : 'Download PDF'}
                  </button>
                </div>
              </div>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={14}
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-700 shadow-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              />
              {/* Hidden div used for PDF rendering */}
              <div
                ref={printRef}
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  top: 0,
                  width: '794px',
                  padding: '72px',
                  fontFamily: "'Calibri Body', Calibri, sans-serif",
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#000',
                  backgroundColor: '#fff',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {coverLetter}
              </div>
            </div>
          )}
        </div>
      </div>
      {showAppliedModal && (
        <AddJobModal
          onClose={() => setShowAppliedModal(false)}
          prefill={{
            companyName: structureRes?.company,
            title: structureRes?.title,
            location: structureRes?.location,
            jobLink: url,
            matchLevel: gapsResult?.score !== undefined ? Math.max(1, Math.round(gapsResult.score / 2)) : undefined,
            analysis: buildAnalysisText() || undefined,
          }}
        />
      )}
    </DashboardShell>
  )
}
