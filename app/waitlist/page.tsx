'use client'

import { useState } from 'react'
import DashboardShell from '../_components/DashboardShell'
import AddWaitlistEntryModal from '../_components/AddWaitlistEntryModal'
import StarRating from '../_components/StarRating'
import { useStore } from '../_lib/store'
import type { WaitlistEntry } from '../_lib/types'

function WaitlistRow({ entry }: { entry: WaitlistEntry }) {
  const { promoteWaitlistEntry, deleteWaitlistEntry, updateWaitlistMatch } = useStore()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div className="flex items-center gap-4 border-b border-zinc-100 px-6 py-4 last:border-0 hover:bg-zinc-50">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-zinc-900">{entry.companyName}</span>
          <span className="text-zinc-400">—</span>
          <span className="text-zinc-700">{entry.jobTitle}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {entry.jobPostingId && (
            <span className="font-mono text-xs text-zinc-400">{entry.jobPostingId}</span>
          )}
          {entry.jobLink && (
            <a
              href={entry.jobLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              View Posting →
            </a>
          )}
        </div>
      </div>

      <StarRating
        value={entry.matchLevel}
        onChange={(n) => updateWaitlistMatch(entry.id, n)}
      />

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => promoteWaitlistEntry(entry.id)}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          I Applied
        </button>

        {confirmingDelete ? (
          <span className="flex items-center gap-2 text-sm text-zinc-500">
            Remove?
            <button
              onClick={() => deleteWaitlistEntry(entry.id)}
              className="font-medium text-red-600 hover:text-red-700"
            >
              Confirm
            </button>
            <span className="text-zinc-300">·</span>
            <button onClick={() => setConfirmingDelete(false)} className="hover:text-zinc-700">
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

export default function WaitlistPage() {
  const { data } = useStore()
  const [showModal, setShowModal] = useState(false)

  const sorted = [...data.waitlist].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <DashboardShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-900">Waiting List</h1>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              <span className="text-base leading-none">+</span>
              Add Entry
            </button>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-zinc-400">No entries yet.</p>
                <p className="mt-1 text-sm text-zinc-400">Add jobs you plan to apply to.</p>
              </div>
            ) : (
              sorted.map((entry) => <WaitlistRow key={entry.id} entry={entry} />)
            )}
          </div>
        </div>
      </div>

      {showModal && <AddWaitlistEntryModal onClose={() => setShowModal(false)} />}
    </DashboardShell>
  )
}
