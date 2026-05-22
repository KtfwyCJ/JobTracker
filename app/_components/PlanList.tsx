'use client'

import { useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../_lib/store'
import type { Plan } from '../_lib/types'

interface Props {
  plans: Plan[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function PlanCard({
  plan,
  isSelected,
  onSelect,
  onDelete,
  onRename,
}: {
  plan: Plan
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(plan.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plan.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(plan.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitRename() {
    const trimmed = draft.trim() || 'Untitled Plan'
    setEditing(false)
    if (trimmed !== plan.title) onRename(trimmed)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-lg pl-6 pr-7 py-2.5 mb-1 border transition-colors ${
        isSelected
          ? 'border-blue-400 bg-blue-50'
          : 'border-transparent hover:bg-zinc-50'
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab touch-none select-none text-zinc-300 group-hover:text-zinc-500 flex items-center active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2.5" cy="3" r="1.5"/>
          <circle cx="7.5" cy="3" r="1.5"/>
          <circle cx="2.5" cy="8" r="1.5"/>
          <circle cx="7.5" cy="8" r="1.5"/>
          <circle cx="2.5" cy="13" r="1.5"/>
          <circle cx="7.5" cy="13" r="1.5"/>
        </svg>
      </div>

      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setEditing(false)
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded border border-blue-300 bg-white px-1 py-0.5 text-xs font-semibold text-zinc-900 outline-none focus:ring-1 focus:ring-blue-400"
        />
      ) : (
        <div
          onDoubleClick={startEdit}
          className="truncate text-xs font-semibold text-zinc-900"
          title={plan.title}
        >
          {plan.title}
        </div>
      )}
      <div className="mt-0.5 text-[10px] text-zinc-400">{relativeDate(plan.updatedAt)}</div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute right-2 top-2 hidden rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 group-hover:flex items-center justify-center"
        title="Delete plan"
      >
        ×
      </button>
    </div>
  )
}

export default function PlanList({ plans, selectedId, onSelect, onAdd, onDelete }: Props) {
  const { updatePlan, reorderPlans } = useStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = plans.findIndex((p) => p.id === active.id)
    const newIndex = plans.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(plans, oldIndex, newIndex)
    reorderPlans(reordered.map((p) => p.id))
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2.5">
        <span className="text-xs font-semibold text-zinc-900">Plans</span>
        <button
          onClick={onAdd}
          className="rounded px-2 py-0.5 text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {plans.length === 0 ? (
          <p className="px-1 py-3 text-xs text-zinc-400">No plans yet. Click + to create one.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={plans.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isSelected={plan.id === selectedId}
                  onSelect={() => onSelect(plan.id)}
                  onDelete={() => onDelete(plan.id)}
                  onRename={(title) => updatePlan(plan.id, { title })}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
