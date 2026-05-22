'use client'

import { useEffect, useRef, useState } from 'react'
import DashboardShell from '../_components/DashboardShell'
import PlanList from '../_components/PlanList'
import PlanToc from '../_components/PlanToc'
import PlanEditor from '../_components/PlanEditor'
import { useStore } from '../_lib/store'

export default function PlanPage() {
  const { data, addPlan, deletePlan } = useStore()
  const { plans } = data
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Initialize selection to first plan once data is loaded
  useEffect(() => {
    if (selectedId === null && plans.length > 0) {
      setSelectedId(plans[0].id)
    }
  }, [plans, selectedId])

  const selectedPlan = plans.find((p) => p.id === selectedId) ?? null

  function handleAdd() {
    const id = addPlan()
    setSelectedId(id)
  }

  function handleDelete(id: string) {
    const idx = plans.findIndex((p) => p.id === id)
    deletePlan(id)
    if (id === selectedId) {
      const remaining = plans.filter((p) => p.id !== id)
      if (remaining.length === 0) {
        setSelectedId(null)
      } else {
        // Pick previous, or next if deleting the first
        const nextIdx = Math.max(0, idx - 1)
        setSelectedId(remaining[Math.min(nextIdx, remaining.length - 1)].id)
      }
    }
  }

  return (
    <DashboardShell>
      <div className="flex h-full w-full flex-1 overflow-hidden bg-white">
        {/* Col 1: Plan list */}
        <div className="w-56 shrink-0 border-r border-zinc-200">
          <PlanList
            plans={plans}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </div>

        {/* Col 2: Outline tree */}
        <div className="w-40 shrink-0 border-r border-zinc-200">
          {selectedPlan ? (
            <PlanToc content={selectedPlan.content} contentRef={contentRef} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-400">No plan selected</p>
            </div>
          )}
        </div>

        {/* Col 3: Markdown content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {selectedPlan ? (
            <PlanEditor
              planId={selectedPlan.id}
              content={selectedPlan.content}
              contentRef={contentRef}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-zinc-400">No plans yet.</p>
                <button
                  onClick={handleAdd}
                  className="mt-2 text-sm text-blue-500 hover:underline"
                >
                  Click + to create one
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
