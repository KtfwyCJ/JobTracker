'use client'

import { useState } from 'react'
import { useStore } from '../_lib/store'
import type { LearningResourceStatus, LearningResourceType } from '../_lib/types'
import {
  LEARNING_RESOURCE_TYPE_LABELS,
  LEARNING_RESOURCE_STATUS_COLORS,
  LEARNING_RESOURCE_STATUS_LABELS,
  LEARNING_RESOURCE_TYPES,
} from '../_lib/types'
import ResourceDrawer from './ResourceDrawer'
import AddResourceModal from './AddResourceModal'

const ALL = 'all' as const
type TypeFilter = typeof ALL | LearningResourceType
type StatusFilter = typeof ALL | LearningResourceStatus

const STATUS_OPTIONS: StatusFilter[] = ['all', 'want_to_learn', 'in_progress', 'done']

export default function ResourceList() {
  const { data } = useStore()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const filtered = data.learningResources.filter((r) => {
    if (typeFilter !== ALL && r.type !== typeFilter) return false
    if (statusFilter !== ALL && r.status !== statusFilter) return false
    return true
  })

  const selectedResource = selectedId
    ? data.learningResources.find((r) => r.id === selectedId) ?? null
    : null

  return (
    <>
      <div className={`flex flex-col gap-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 ${selectedResource ? 'min-w-0 flex-1' : 'flex-1'}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Resources</h2>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
          >
            + Add
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTypeFilter(ALL)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              typeFilter === ALL ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            All
          </button>
          {LEARNING_RESOURCE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {LEARNING_RESOURCE_TYPE_LABELS[t]}
            </button>
          ))}
          <div className="ml-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-500 outline-none focus:border-zinc-400"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === ALL ? 'All statuses' : LEARNING_RESOURCE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resource rows */}
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-400">No resources yet. Add one to get started.</p>
          )}
          {filtered.map((resource) => (
            <button
              key={resource.id}
              onClick={() => setSelectedId(selectedId === resource.id ? null : resource.id)}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                selectedId === resource.id
                  ? 'bg-blue-50 ring-1 ring-blue-200'
                  : 'bg-zinc-50 hover:bg-zinc-100'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{resource.title}</p>
                <p className="text-xs text-zinc-400">
                  {LEARNING_RESOURCE_TYPE_LABELS[resource.type]}
                  {resource.author && ` · ${resource.author}`}
                  {resource.linkedJobIds.length > 0 && ` · ${resource.linkedJobIds.length} job${resource.linkedJobIds.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${LEARNING_RESOURCE_STATUS_COLORS[resource.status]}`}
              >
                {LEARNING_RESOURCE_STATUS_LABELS[resource.status]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedResource && (
        <ResourceDrawer
          resource={selectedResource}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showModal && <AddResourceModal onClose={() => setShowModal(false)} />}
    </>
  )
}
