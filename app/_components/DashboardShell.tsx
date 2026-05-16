'use client'

import { useState } from 'react'
import Navbar from './Navbar'
import AddJobModal from './AddJobModal'
import { useStore } from '../_lib/store'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false)
  const { editingJobId, setEditingJobId, getJob } = useStore()

  const editingJob = editingJobId ? getJob(editingJobId) : undefined

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-50">
      <Navbar onAddJob={() => setShowModal(true)} />
      <div className="flex flex-1 overflow-hidden">{children}</div>
      {showModal && <AddJobModal onClose={() => setShowModal(false)} />}
      {editingJobId && editingJob && (
        <AddJobModal job={editingJob} onClose={() => setEditingJobId(null)} />
      )}
    </div>
  )
}
