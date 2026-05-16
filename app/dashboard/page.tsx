import DashboardShell from '../_components/DashboardShell'
import JobList from '../_components/JobList'
import JobDetail from '../_components/JobDetail'

export default function DashboardPage() {
  return (
    <DashboardShell>
      <JobList />
      <JobDetail />
    </DashboardShell>
  )
}
