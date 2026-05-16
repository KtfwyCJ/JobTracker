import DashboardShell from '../_components/DashboardShell'
import CalendarView from '../_components/CalendarView'

export default function CalendarPage() {
  return (
    <DashboardShell>
      <div className="flex-1 overflow-auto bg-zinc-50 p-4">
        <CalendarView />
      </div>
    </DashboardShell>
  )
}
