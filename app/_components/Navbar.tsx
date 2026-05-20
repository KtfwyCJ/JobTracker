'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '../_lib/store'

export default function Navbar({ onAddJob }: { onAddJob: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data, setSelectedJobId, setStarFilter } = useStore()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => {
            setSelectedJobId(null)
            setStarFilter(null)
            router.push('/dashboard')
          }}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <span className="text-base font-semibold text-zinc-900">JobTracker</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
            {data.jobs.length} applied
          </span>
        </button>
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
          <Link
            href="/analyze"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === '/analyze'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Analyze
          </Link>
          <Link
            href="/explore"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === '/explore'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Explore
          </Link>
          <Link
            href="/learn"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === '/learn'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Learn
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
