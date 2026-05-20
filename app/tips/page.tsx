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
      <div className="flex h-full w-full flex-1 overflow-hidden bg-white">
        {/* Left sidebar */}
        <div className="w-64 shrink-0 border-r border-zinc-200">
          <TipList
            tips={data.interviewTips}
            selectedId={selectedTipId}
            onSelect={setSelectedTipId}
          />
        </div>
        {/* Right panel — fills all remaining space */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {selectedTip ? (
            <TipDetail
              key={selectedTip.id}
              tip={selectedTip}
              onDeleted={() => setSelectedTipId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-zinc-400">Select a prep entry or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
