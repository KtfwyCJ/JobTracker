'use client'

import { useState } from 'react'
import DashboardShell from '../_components/DashboardShell'
import TipList from '../_components/TipList'
import TipDetail from '../_components/TipDetail'
import { useStore } from '../_lib/store'

export default function TipsPage() {
  const { data } = useStore()
  const [selectedTipId, setSelectedTipId] = useState<string | null>(null)

  const selectedTip = selectedTipId
    ? data.interviewTips.find((t) => t.id === selectedTipId) ?? null
    : null

  return (
    <DashboardShell>
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="w-64 shrink-0 overflow-hidden">
          <TipList
            tips={data.interviewTips}
            selectedId={selectedTipId}
            onSelect={setSelectedTipId}
          />
        </div>
        <div className="flex flex-1 overflow-hidden">
          {selectedTip ? (
            <TipDetail
              key={selectedTip.id}
              tip={selectedTip}
              onDeleted={() => setSelectedTipId(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white">
              <p className="text-sm text-zinc-400">Select a prep entry or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
