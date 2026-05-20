'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { useStore } from '../_lib/store'

interface Props {
  content: string
  // ref to the scroll container — PlanToc uses this to observe headings
  contentRef: React.RefObject<HTMLDivElement | null>
}

export default function PlanEditor({ content, contentRef }: Props) {
  const { updatePlanDocument } = useStore()
  const [mode, setMode] = useState<'read' | 'edit'>('read')
  const [draft, setDraft] = useState(content)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDraft(content)
  }, [content])

  const save = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => updatePlanDocument(value), 400)
    },
    [updatePlanDocument]
  )

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={() => setMode(mode === 'read' ? 'edit' : 'read')}
          className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
        >
          {mode === 'read' ? 'Edit' : 'Preview'}
        </button>
      </div>

      {mode === 'edit' ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => { setDraft(e.target.value); save(e.target.value) }}
          placeholder="Write your plan in markdown…"
          className="flex-1 resize-none p-6 pt-12 font-mono text-sm text-zinc-700 outline-none"
        />
      ) : (
        // contentRef points to this scroll container so PlanToc can observe headings inside it
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 pt-12">
          {content.trim() ? (
            <div className="prose prose-sm max-w-none prose-headings:text-zinc-900 prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-zinc-700 prose-li:text-zinc-700 prose-a:text-blue-500 prose-strong:text-zinc-900 prose-hr:border-zinc-200 prose-blockquote:border-zinc-300 prose-blockquote:text-zinc-500">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-zinc-400">No plan yet.</p>
                <button
                  onClick={() => setMode('edit')}
                  className="mt-2 text-sm text-blue-500 hover:underline"
                >
                  Click Edit to start writing
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
