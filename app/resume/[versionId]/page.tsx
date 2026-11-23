'use client'

import { use, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/app/_components/DashboardShell'
import AddJobModal from '@/app/_components/AddJobModal'
import SuggestionList from '@/app/_components/resume/SuggestionList'
import ResumeDiff from '@/app/_components/resume/ResumeDiff'
import CoveragePanel from '@/app/_components/resume/CoveragePanel'
import GapList from '@/app/_components/resume/GapList'
import LatexEditor from '@/app/_components/resume/LatexEditor'
import ManualDiff from '@/app/_components/resume/ManualDiff'
import type { ProfileId } from '@/app/_lib/resume/types'
import { useVersion } from './useVersion'

// Mirrors PROFILE_IDS / MAX_PAGE_FILL in app/_lib/resume — not imported to keep server modules out of the client bundle.
const PROFILES: ProfileId[] = ['ai-engineer', 'senior-fullstack', 'senior-frontend']
const MAX_PAGE_FILL = 1.5
const LOCKED_NOTE = '已手动编辑 LaTeX，建议已锁定。放弃手改后可重新勾选。'

const card = 'rounded-xl border border-zinc-200 bg-white p-4 shadow-sm'
const btnPrimary = 'rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50'
const btnSecondary = 'rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50'

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-zinc-900">{children}</h2>
      {aside}
    </div>
  )
}

export default function Page({ params, searchParams }: {
  params: Promise<{ versionId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { versionId } = use(params)
  const sp = use(searchParams)
  const regeneratedNotice = sp.regenerated === '1'
  const manualDroppedNotice = sp.manualDropped === '1'
  const router = useRouter()
  const {
    view, accepted, loadError, error, pending, busy, renderStamp, toggle, regenerate, finalize, duplicate,
    texDraft, setTexDraft, dirty, saving, startManual, saveNow, discardManual,
  } = useVersion(versionId)
  const [showApplied, setShowApplied] = useState(false)
  const [diffTab, setDiffTab] = useState<'plan' | 'manual'>('manual')

  const companies = useMemo(
    () => Object.fromEntries((view?.diff.sections ?? []).map((s) => [s.experienceId, s.company])),
    [view],
  )
  const bulletText = useMemo(
    () => Object.fromEntries((view?.diff.sections ?? []).flatMap((s) => s.rows.map((r) => [r.bulletId, r.text]))),
    [view],
  )

  if (loadError && !view) {
    return (
      <DashboardShell>
        <div className="flex-1 p-8 text-sm text-red-600">加载失败：{loadError}</div>
      </DashboardShell>
    )
  }
  if (!view) {
    return (
      <DashboardShell>
        <div className="flex-1 p-8 text-sm text-zinc-500">加载中…</div>
      </DashboardShell>
    )
  }

  const isFinal = view.status === 'final'
  const locked = isFinal || busy !== null
  const manual = view.manual
  const showDiffTab = manual ? diffTab : 'plan'

  const onProfileChange = (p: ProfileId) => {
    if (p === view.llmPlan.profile) return
    if (!confirm('为该 profile 重新生成方案？')) return
    void regenerate(p)
  }

  const onDuplicate = async () => {
    const r = await duplicate()
    if (!r) return
    const q = [r.regenerated && 'regenerated=1', r.manualDropped && 'manualDropped=1'].filter(Boolean).join('&')
    router.push('/resume/' + r.id + (q ? '?' + q : ''))
  }

  const over = view.pageFill !== null && view.pageFill > MAX_PAGE_FILL
  // pageFill is stored unrounded; show 3 decimals when 2 would hide that it is over the limit (e.g. 1.504).
  const fillText = view.pageFill === null ? '—'
    : over && view.pageFill.toFixed(2) === MAX_PAGE_FILL.toFixed(2) ? view.pageFill.toFixed(3) : view.pageFill.toFixed(2)

  return (
    <DashboardShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
          {/* Header */}
          <div className={card}>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold text-zinc-900">
                {view.jd.title || '未命名职位'}
                {view.jd.company ? <span className="font-normal text-zinc-500"> · {view.jd.company}</span> : null}
              </h1>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isFinal ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                {isFinal ? '已定稿' : '草稿'}
              </span>
              {manual && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">含手动修改</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2 text-zinc-600">
                Profile
                <select
                  value={view.llmPlan.profile}
                  disabled={locked || pending || manual}
                  onChange={(e) => onProfileChange(e.target.value as ProfileId)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-500 disabled:opacity-50"
                >
                  {PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              {busy === 'regenerate' && <span className="text-zinc-500">重新生成中…</span>}
              <span className="min-w-0 flex-1 text-zinc-500">{view.llmPlan.profileReason}</span>
              {view.llmPlan.fit === 'low' && (
                <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">⚠ fit: low — 该职位与证据库匹配度较低</span>
              )}
            </div>
          </div>

          {regeneratedNotice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              证据库已变化，原方案不再有效，已为此草稿重新生成方案（勾选已重置为全选）。
              {manualDroppedNotice && ' 原版本的手改内容未保留。'}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="font-medium">{error.message}</p>
              {error.details.length > 0 && (
                <ul className="mt-1 list-disc pl-4">{error.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
              )}
            </div>
          )}

          {/* Suggestions | gaps */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={card}>
              <SectionTitle aside={pending && <span className="text-[11px] text-zinc-500">渲染中…</span>}>建议</SectionTitle>
              <SuggestionList
                suggestions={view.suggestions}
                accepted={accepted}
                disabled={locked || manual}
                companies={companies}
                bulletText={bulletText}
                onToggle={toggle}
                lockedNote={manual ? LOCKED_NOTE : undefined}
              />
            </div>
            <div className={card}>
              <SectionTitle>证据缺口</SectionTitle>
              <GapList {...view.gaps} />
            </div>
          </div>

          {/* LaTeX | PDF */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={card}>
              <SectionTitle>LaTeX 源码</SectionTitle>
              <LatexEditor
                value={manual ? texDraft : view.tex}
                manual={manual}
                isFinal={isFinal}
                dirty={dirty}
                saving={saving}
                compileError={view.compileError}
                canStart={!isFinal && busy === null && !pending}
                switching={busy === 'manual'}
                requestError={error?.message}
                onChange={setTexDraft}
                onStart={() => void startManual()}
                onSaveNow={() => void saveNow()}
                onDiscard={() => void discardManual()}
              />
            </div>
            <div className={card}>
              <SectionTitle>PDF 预览</SectionTitle>
              {view.compileError && !manual ? (
                <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-[11px] text-red-700">{view.compileError}</pre>
              ) : (
                <iframe
                  key={renderStamp}
                  src={`/api/resume/${view.id}/pdf?t=${renderStamp}`}
                  title="CV PDF preview"
                  className="aspect-[210/297] w-full rounded-lg border border-zinc-200"
                />
              )}
            </div>
          </div>

          {/* Diff */}
          <div className={card}>
            <SectionTitle
              aside={manual && (
                <div className="flex gap-1 text-[11px]">
                  {([['plan', '基础版 vs 方案'], ['manual', '生成版 vs 手改']] as const).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setDiffTab(k)}
                      className={`rounded-md px-2 py-0.5 font-medium ${showDiffTab === k ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            >
              {showDiffTab === 'manual' ? '改动对比（生成版 vs 手改）' : '改动对比（基础版 vs 当前）'}
            </SectionTitle>
            {showDiffTab === 'manual'
              ? <ManualDiff hunks={view.manualDiff} />
              : <ResumeDiff sections={view.diff.sections} skills={view.diff.skills} />}
          </div>

          {/* Score, page fill, actions */}
          <div className={`${card} space-y-3`}>
            <CoveragePanel base={view.coverageBase} final={view.coverageFinal} />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-600">
                篇幅{' '}
                <span className={over ? 'font-semibold text-red-600' : 'font-medium text-zinc-900'}>
                  {fillText} / {MAX_PAGE_FILL} 页
                </span>
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                {!isFinal && (
                  <button
                    className={btnPrimary}
                    disabled={!view.canFinalize || pending || busy !== null}
                    onClick={() => void finalize()}
                  >
                    {busy === 'finalize' ? '定稿中…' : '确认定稿'}
                  </button>
                )}
                {isFinal && (
                  <>
                    <button className={btnPrimary} onClick={() => setShowApplied(true)}>标记为已投递</button>
                    <button className={btnSecondary} disabled={busy !== null} onClick={() => void onDuplicate()}>
                      {busy === 'duplicate' ? '复制中…' : '复制为新草稿'}
                    </button>
                  </>
                )}
              </div>
            </div>
            {view.layoutWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-medium">版式溢出：有内容超出页面边缘（不可见），无法定稿。</p>
                <ul className="mt-1 list-disc pl-4">{view.layoutWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            {view.validationErrors.length > 0 && (
              <ul className="list-disc space-y-0.5 rounded-lg bg-red-50 p-3 pl-7 text-xs text-red-700">
                {view.validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
      {showApplied && (
        <AddJobModal
          onClose={() => setShowApplied(false)}
          prefill={{
            companyName: view.jd.company,
            title: view.jd.title,
            location: view.jd.location,
            jobLink: view.jobUrl,
            description: view.jobText,
            analysis: view.analysis,
            matchLevel: view.gapsScore !== undefined ? Math.max(1, Math.round(view.gapsScore / 2)) : undefined,
            resumeVersionId: view.id,
          }}
        />
      )}
    </DashboardShell>
  )
}
