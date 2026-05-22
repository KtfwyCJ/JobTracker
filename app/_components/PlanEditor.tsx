'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { useStore } from '../_lib/store'

interface Props {
  planId: string
  content: string
  contentRef: React.RefObject<HTMLDivElement | null>
}

export default function PlanEditor({ planId, content, contentRef }: Props) {
  const { updatePlan } = useStore()
  const [mode, setMode] = useState<'read' | 'edit'>('read')
  const [draft, setDraft] = useState(content)
  const draftRef = useRef(draft)

  useEffect(() => {
    setDraft(content)
    draftRef.current = content
    setMode('read')
  }, [planId])

  function save() {
    const match = draftRef.current.match(/^#\s+(.+)$/m)
    const title = match ? match[1].trim() : 'Untitled Plan'
    updatePlan(planId, { content: draftRef.current, title })
    setMode('read')
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {mode === 'edit' ? (
          <>
            <button
              onClick={() => { setDraft(content); draftRef.current = content; setMode('read') }}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500 shadow-sm hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-zinc-700"
            >
              Save
            </button>
          </>
        ) : (
          <button
            onClick={() => setMode('edit')}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
          >
            Edit
          </button>
        )}
      </div>

      {mode === 'edit' ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => { setDraft(e.target.value); draftRef.current = e.target.value }}
          placeholder="Write your plan in markdown…"
          className="flex-1 resize-none p-6 pt-12 font-mono text-sm text-zinc-700 outline-none"
        />
      ) : (
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
                <p className="text-sm text-zinc-400">No content yet.</p>
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
