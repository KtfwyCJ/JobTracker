'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
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
interface SalaryResult { currency?: string; period?: string; min?: number; max?: number; median?: number; confidence?: string; rationale?: string; comparables?: string[] }
interface CoverLetterResult { coverLetter: string }

// Steps run by "Simple Analyze": parse the job + score it against the base CV
const SIMPLE_STEP_IDS = ['extract', 'structure', 'match', 'gaps']

const INITIAL_STEPS: Step[] = [
  { id: 'extract', label: 'JD Extractor', status: 'idle', preview: '', error: '' },
  { id: 'structure', label: 'JD Structurer', status: 'idle', preview: '', error: '' },
  { id: 'resumePlan', label: 'Resume Plan', status: 'idle', preview: '', error: '' },
  { id: 'match', label: 'CV Matcher', status: 'idle', preview: '', error: '' },
  { id: 'gaps', label: 'Gap Analyzer', status: 'idle', preview: '', error: '' },
  { id: 'salary', label: 'Salary Estimator', status: 'idle', preview: '', error: '' },
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
  const [salaryResult, setSalaryResult] = useState<SalaryResult | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [retryFromIndex, setRetryFromIndex] = useState<number | null>(null)
  const [showAppliedModal, setShowAppliedModal] = useState(false)
  const [simpleMode, setSimpleMode] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Stored intermediate results for retry
  const [extractRes, setExtractRes] = useState<ExtractResult | null>(null)
  const [structureRes, setStructureRes] = useState<StructureResult | null>(null)
  const [matchRes, setMatchRes] = useState<MatchResult | null>(null)
  const [resumeVersionId, setResumeVersionId] = useState<string | null>(null)

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

  async function runPipeline(startFrom = 0, simple = simpleMode) {
    if (!url.trim()) return
    setRunning(true)
    setRetryFromIndex(null)
    setSimpleMode(simple)

    // Reset steps from startFrom onwards
    setSteps((prev) =>
      prev.map((s, i) => (i >= startFrom ? { ...s, status: 'idle', preview: '', error: '' } : s))
    )
    if (startFrom === 0) {
      setGapsResult(null)
      setSalaryResult(null)
      setCoverLetter('')
      setExtractRes(null)
      setStructureRes(null)
      setMatchRes(null)
    }
    if (startFrom <= 2) setResumeVersionId(null)

    let extract = startFrom === 0 ? null : extractRes
    let structure = startFrom <= 1 ? null : structureRes
    let versionId = startFrom <= 2 ? null : resumeVersionId
    let match = startFrom <= 3 ? null : matchRes

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

    // Stage 3: Resume Plan — evidence-based draft resume version, reviewed at /resume/<id>
    if (startFrom <= 2 && !simple) {
      versionId = await createResumePlan(structure!, extract?.text)
      if (!versionId) { setRunning(false); setRetryFromIndex(2); return }
      setResumeVersionId(versionId)
      updateStep('resumePlan', { status: 'done', preview: `Draft → /resume/${versionId}` })
    }

    // Stage 4: CV Match (against the evidence-based base CV)
    if (startFrom <= 3) {
      match = await callStage<MatchResult>('match', '/api/cv/match', { jd: structure })
      if (!match) { setRunning(false); setRetryFromIndex(3); return }
      setMatchRes(match)
      const preview = (match.strengths ?? []).slice(0, 2).join(', ')
      updateStep('match', { status: 'done', preview: preview || (match.summary ?? '') })
    }

    // Stage 5: Gap Analysis
    const gaps = await callStage<GapsResult>('gaps', '/api/cv/gaps', { jd: structure, match })
    if (!gaps) { setRunning(false); setRetryFromIndex(4); return }
    setGapsResult(gaps)
    updateStep('gaps', {
      status: 'done',
      preview: `Score ${gaps.score}/10 · ${gaps.verdict ?? ''}`,
    })

    // Simple mode: stop after scoring and add the job to the job list
    if (simple) {
      setRunning(false)
      setShowAppliedModal(true)
      return
    }

    // Stage 6: Salary Estimate
    const salary = await callStage<SalaryResult>('salary', '/api/jd/salary', { jd: structure })
    if (!salary) { setRunning(false); setRetryFromIndex(5); return }
    setSalaryResult(salary)
    updateStep('salary', {
      status: 'done',
      preview: salary.min && salary.max
        ? `${salary.currency ?? ''} ${salary.min.toLocaleString()}–${salary.max.toLocaleString()} / ${salary.period ?? 'year'}`
        : 'Estimated',
    })

    // Store the analysis on the draft resume version (non-fatal)
    if (versionId) {
      const analysis = buildAnalysisText({ gaps, match, salary })
      try {
        const res = await fetch(`/api/resume/${versionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis, gapsScore: gaps.score }),
        })
        if (!res.ok) console.warn(`Failed to store analysis on resume ${versionId}: HTTP ${res.status}`)
      } catch (e) {
        console.warn(`Failed to store analysis on resume ${versionId}:`, e)
      }
    }

    // Stage 7: Cover Letter
    const clResult = await callStage<CoverLetterResult>(
      'coverLetter',
      '/api/cover-letter/generate',
      { jd: structure, match, gaps },
    )
    if (!clResult) { setRunning(false); setRetryFromIndex(6); return }
    setCoverLetter(clResult.coverLetter)
    updateStep('coverLetter', {
      status: 'done',
      preview: `${clResult.coverLetter.split(/\s+/).length} words generated`,
    })

    setRunning(false)
  }

  function handleClear() {
    setUrl('')
    setSimpleMode(false)
    setSteps(INITIAL_STEPS)
    setGapsResult(null)
    setSalaryResult(null)
    setCoverLetter('')
    setRetryFromIndex(null)
    setExtractRes(null)
    setStructureRes(null)
    setMatchRes(null)
    setResumeVersionId(null)
  }

  async function createResumePlan(jd: StructureResult, jobText?: string): Promise<string | null> {
    updateStep('resumePlan', { status: 'running', error: '' })
    try {
      const res = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd, jobUrl: url, jobText }),
      })
      const data = await res.json() as { id?: string; error?: string; errors?: string[] }
      if (!res.ok || !data.id) {
        const error = data.errors?.length ? data.errors.join('\n') : (data.error ?? 'Request failed')
        updateStep('resumePlan', { status: 'error', error })
        return null
      }
      return data.id
    } catch (e) {
      updateStep('resumePlan', { status: 'error', error: e instanceof Error ? e.message : 'Network error' })
      return null
    }
  }

  // Results are passed explicitly mid-pipeline, before the state updates have landed
  function buildAnalysisText(
    r: { gaps: GapsResult | null; match: MatchResult | null; salary: SalaryResult | null } =
      { gaps: gapsResult, match: matchRes, salary: salaryResult },
  ): string {
    const { gaps, match, salary } = r
    const lines: string[] = []
    if (gaps?.score !== undefined) {
      lines.push(`Match: ${gaps.score}/10 — ${gaps.verdict ?? ''}`)
    }
    if (match?.strengths?.length) {
      lines.push('')
      lines.push('Strengths:')
      match.strengths.forEach((s) => lines.push(`• ${s}`))
    }
    if (gaps?.hardGaps?.length) {
      lines.push('')
      lines.push('Hard Gaps:')
      gaps.hardGaps.forEach((g) => lines.push(`• ${g}`))
    }
    if (gaps?.softGaps?.length) {
      lines.push('')
      lines.push('Soft Gaps:')
      gaps.softGaps.forEach((g) => lines.push(`• ${g}`))
    }
    if (salary?.min && salary?.max) {
      lines.push('')
      lines.push(
        `Expected Salary: ${salary.currency ?? ''} ${salary.min.toLocaleString()}–${salary.max.toLocaleString()} / ${salary.period ?? 'year'}` +
          (salary.confidence ? ` (confidence: ${salary.confidence})` : ''),
      )
      if (salary.rationale) lines.push(salary.rationale)
      if (salary.comparables?.length) {
        salary.comparables.forEach((c) => lines.push(`• ${c}`))
      }
    }
    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              onKeyDown={(e) => e.key === 'Enter' && !running && runPipeline(0, false)}
              placeholder="https://jobs.lever.co/..."
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              disabled={running}
            />
            <button
              onClick={() => runPipeline(0, false)}
              disabled={running || !url.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running && !simpleMode ? 'Running…' : 'Analyze'}
            </button>
            <button
              onClick={() => runPipeline(0, true)}
              disabled={running || !url.trim()}
              title="Only parse the job posting and add it to your job list"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running && simpleMode ? 'Running…' : 'Simple Analyze'}
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
              {steps.map((step, i) => (simpleMode && !SIMPLE_STEP_IDS.includes(step.id) ? null : (
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
                  <StepIcon status={step.status} index={simpleMode ? SIMPLE_STEP_IDS.indexOf(step.id) : i} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${step.status === 'idle' ? 'text-zinc-400' : 'text-zinc-900'}`}>
                      {step.label}
                    </p>
                    {step.preview && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{step.preview}</p>
                    )}
                    {step.error && (
                      <p className="mt-0.5 whitespace-pre-line text-xs text-red-600">{step.error}</p>
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
              )))}
            </div>
          )}

          {/* Resume Plan → review page */}
          {resumeVersionId && (
            <Link
              href={`/resume/${resumeVersionId}`}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700"
            >
              审阅简历 →
            </Link>
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
                </div>
              )}
            </div>
          )}

          {/* Salary estimate */}
          {salaryResult && (salaryResult.min !== undefined || salaryResult.rationale) && (
            <div className="mt-4 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-700">Expected Salary</p>
                {salaryResult.confidence && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] capitalize text-zinc-500">
                    {salaryResult.confidence} confidence
                  </span>
                )}
              </div>
              {salaryResult.min !== undefined && salaryResult.max !== undefined && (
                <p className="mt-1.5 text-2xl font-extrabold text-zinc-900">
                  {salaryResult.currency ?? ''} {salaryResult.min.toLocaleString()}–{salaryResult.max.toLocaleString()}
                  <span className="ml-1 text-sm font-medium text-zinc-400">/ {salaryResult.period ?? 'year'}</span>
                </p>
              )}
              {salaryResult.rationale && (
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">{salaryResult.rationale}</p>
              )}
              {salaryResult.comparables && salaryResult.comparables.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {salaryResult.comparables.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                      <span className="mt-0.5 text-zinc-300">●</span>{c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Add to Job List (simple mode) */}
          {simpleMode && structureRes && !running && (
            <div className="mt-4">
              <button
                onClick={() => setShowAppliedModal(true)}
                className="w-full rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
              >
                Add to Job List
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
            description: extractRes?.text,
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
