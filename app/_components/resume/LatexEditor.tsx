'use client'

interface Props {
  value: string
  /** Manual LaTeX mode: the textarea is editable. */
  manual: boolean
  isFinal: boolean
  dirty: boolean
  saving: boolean
  compileError?: string
  /** "开始手动编辑" is clickable (draft, nothing in flight). */
  canStart: boolean
  /** Start/discard request in flight. */
  switching: boolean
  /** Last failed request (shown here too: the page-level banner is far above the editor). */
  requestError?: string
  onChange: (s: string) => void
  onStart: () => void
  onSaveNow: () => void
  onDiscard: () => void
}

const btn = 'rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50'
const btnDark = 'rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50'

function Status({ manual, dirty, saving, compileError }: Pick<Props, 'manual' | 'dirty' | 'saving' | 'compileError'>) {
  if (!manual) return null
  if (saving) return <span className="text-zinc-500">编译中…</span>
  if (dirty) return <span className="text-amber-600">未保存</span>
  if (compileError) return <span className="text-red-600">编译失败</span>
  return <span className="text-green-600">已保存</span>
}

export default function LatexEditor(p: Props) {
  // Not editable while start/discard is in flight: an edit then would schedule a save that re-enters manual mode.
  const editable = p.manual && !p.isFinal && !p.switching
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      if (editable) p.onSaveNow()
    }
  }
  const onDiscard = () => {
    if (confirm('放弃所有手改，回到按建议生成的版本？')) p.onDiscard()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {!p.manual && !p.isFinal && (
          <button className={btnDark} disabled={!p.canStart || p.switching} onClick={p.onStart}>
            {p.switching ? '处理中…' : '开始手动编辑'}
          </button>
        )}
        {p.manual && !p.isFinal && (
          <>
            <button className={btnDark} disabled={p.saving || p.switching} onClick={p.onSaveNow}>编译 ⌘S</button>
            <button className={btn} disabled={p.switching} onClick={onDiscard}>{p.switching ? '处理中…' : '放弃手改'}</button>
          </>
        )}
        {!p.manual && !p.isFinal && <span className="text-zinc-500">只读：内容由勾选的建议生成</span>}
        <span className="ml-auto"><Status manual={p.manual} dirty={p.dirty} saving={p.saving} compileError={p.compileError} /></span>
      </div>
      {p.requestError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">请求失败：{p.requestError}</p>
      )}
      {p.manual && p.compileError && !p.saving && (
        <details className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <summary className="cursor-pointer font-medium">编译失败，右侧仍是上一版成功的 PDF（展开查看日志）</summary>
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-[11px]">{p.compileError}</pre>
        </details>
      )}
      <textarea
        value={p.value}
        readOnly={!editable}
        spellCheck={false}
        onChange={(e) => p.onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`h-[75vh] w-full resize-none rounded-lg border p-3 font-mono text-[12px] leading-5 outline-none ${
          editable ? 'border-zinc-300 bg-white text-zinc-900 focus:border-zinc-500' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
        }`}
      />
    </div>
  )
}
