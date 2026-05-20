'use client'

import { useEffect, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: 1 | 2 | 3
}

interface Props {
  content: string
  contentRef: React.RefObject<HTMLDivElement | null>
}

export default function PlanToc({ content, contentRef }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>('')

  // Re-parse headings from DOM whenever content changes
  useEffect(() => {
    if (!contentRef.current) return
    const els = Array.from(contentRef.current.querySelectorAll('h1, h2, h3'))
    setHeadings(
      els.map((el) => ({
        id: el.id,
        text: el.textContent ?? '',
        level: parseInt(el.tagName[1]) as 1 | 2 | 3,
      }))
    )
  }, [content, contentRef])

  // Scroll spy via IntersectionObserver — root is the scroll container
  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    const headingEls = Array.from(root.querySelectorAll('h1, h2, h3'))
    if (headingEls.length === 0) return

    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        })
        // Pick the topmost visible heading
        for (const el of headingEls) {
          if (visible.has(el.id)) {
            setActiveId(el.id)
            return
          }
        }
      },
      { root, rootMargin: '0px 0px -65% 0px', threshold: 0 }
    )

    headingEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings, contentRef])

  function scrollTo(id: string) {
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-900">Plan</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {headings.length === 0 ? (
          <p className="px-4 py-3 text-xs text-zinc-400">No headings yet</p>
        ) : (
          headings.map((h) => (
            <button
              key={h.id}
              onClick={() => scrollTo(h.id)}
              className={`w-full truncate py-1 text-left text-xs transition-colors ${
                h.level === 1 ? 'px-4 font-semibold' : h.level === 2 ? 'pl-7 pr-4 font-medium' : 'pl-10 pr-4'
              } ${
                activeId === h.id
                  ? 'border-l-2 border-blue-500 bg-blue-50 text-blue-600'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {h.text}
            </button>
          ))
        )}
      </nav>
    </div>
  )
}
