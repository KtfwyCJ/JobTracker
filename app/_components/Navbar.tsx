'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar({ onAddJob }: { onAddJob: () => void }) {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4">
      <div className="flex items-center gap-6">
        <span className="text-base font-semibold text-zinc-900">JobTracker</span>
        <nav className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === '/dashboard'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Companies
          </Link>
          <Link
            href="/board"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === '/board'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Board
          </Link>
          <Link
            href="/calendar"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === '/calendar'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Calendar
          </Link>
          <Link
            href="/waitlist"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === '/waitlist'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Waiting List
          </Link>
        </nav>
      </div>
      <button
        onClick={onAddJob}
        className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        <span className="text-base leading-none">+</span>
        Add Job
      </button>
    </header>
  )
}
