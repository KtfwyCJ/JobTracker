import DashboardShell from '../_components/DashboardShell'
import KanbanBoard from '../_components/KanbanBoard'

export default function BoardPage() {
  return (
    <DashboardShell>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </DashboardShell>
  )
}
