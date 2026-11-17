'use client'

import { useState } from 'react'
import type { Coverage, CoverageGroup } from '@/app/_lib/resume/coverage'

interface Props {
  base: Coverage
  final: Coverage
}

const GROUPS: { key: keyof Coverage; label: string }[] = [
  { key: 'mustHave', label: '必须' },
  { key: 'plus', label: '加分' },
  { key: 'keywords', label: '关键词' },
]

function Items({ base, final }: { base: CoverageGroup; final: CoverageGroup }) {
  if (final.items.length === 0) return <p className="text-[11px] text-zinc-400">JD 中没有此类条目。</p>
  return (
    <ul className="space-y-0.5">
      {final.items.map((it, i) => {
        const was = base.items[i]?.covered ?? false
        const mark = it.covered ? (was ? '✓' : '＋') : was ? '−' : '✗'
        const color = it.covered ? (was ? 'text-green-700' : 'text-green-700 font-semibold') : was ? 'text-red-700 font-semibold' : 'text-zinc-400'
        return (
          <li key={`${i}-${it.text}`} className={`text-[11px] ${color}`}>
            <span className="inline-block w-4">{mark}</span>
            {it.text}
            {it.matched.length > 0 && <span className="ml-1 text-zinc-400">({it.matched.join(', ')})</span>}
          </li>
        )
      })}
    </ul>
  )
}

export default function CoveragePanel({ base, final }: Props) {
  const [open, setOpen] = useState<keyof Coverage | null>(null)
  return (
    <div className="text-xs">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        <span className="mr-1 font-medium text-zinc-700">匹配度</span>
        {GROUPS.map((g, i) => {
          const b = base[g.key], f = final[g.key]
          const delta = f.covered - b.covered
          return (
            <span key={g.key} className="flex items-center">
              {i > 0 && <span className="mx-1 text-zinc-300">·</span>}
              <button
                type="button"
                onClick={() => setOpen(open === g.key ? null : g.key)}
                className={`rounded px-1.5 py-0.5 hover:bg-zinc-100 ${open === g.key ? 'bg-zinc-100' : ''}`}
              >
                {g.label} {b.covered}/{b.total} →{' '}
                <span className={delta > 0 ? 'font-semibold text-green-700' : delta < 0 ? 'font-semibold text-red-700' : 'text-zinc-800'}>
                  {f.covered}/{f.total}
                </span>
              </button>
            </span>
          )
        })}
      </div>
      {open && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <Items base={base[open]} final={final[open]} />
        </div>
      )}
    </div>
  )
}
