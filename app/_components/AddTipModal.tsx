'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../_lib/store'

export default function AddTipModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data, addInterviewTip } = useStore()
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [linkedJobId, setLinkedJobId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || !position.trim()) return
    const id = addInterviewTip(company.trim(), position.trim(), linkedJobId || undefined)
    onCreated(id)
  }

  const jobOptions = data.jobs.map((j) => {
    const co = data.companies.find((c) => c.id === j.companyId)
    return { id: j.id, label: `${co?.name ?? '?'} — ${j.title}` }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">New Interview Prep</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Company *</label>
            <input
              ref={inputRef}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Position *</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Backend Engineer"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Linked Job (optional)</label>
            <select
              value={linkedJobId}
              onChange={(e) => setLinkedJobId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">— None —</option>
              {jobOptions.map((j) => (
                <option key={j.id} value={j.id}>{j.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
