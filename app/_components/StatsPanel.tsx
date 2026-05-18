'use client'

import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useStore } from '../_lib/store'
import { JOB_STATUSES, STATUS_LABELS, STATUS_DOT_COLORS, INTERVIEW_TYPE_LABELS, type JobStatus } from '../_lib/types'

const STATUS_HEX: Record<JobStatus, string> = {
  applied: '#3b82f6',
  phone_screen: '#a855f7',
  technical_interview: '#06b6d4',
  onsite: '#f97316',
  offer: '#f59e0b',
  accepted: '#22c55e',
  rejected: '#ef4444',
}


function StatCard({
  value,
  label,
  accent = 'text-zinc-900',
  onClick,
}: {
  value: number
  label: string
  accent?: string
  onClick?: () => void
}) {
  const base = 'flex flex-col items-center justify-center rounded-2xl border px-4 py-5 shadow-sm'
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer w-full`}
      >
        <span className={`text-3xl font-extrabold leading-none ${accent}`}>{value}</span>
        <span className="mt-1.5 text-center text-xs font-medium text-zinc-400">{label}</span>
        <span className="mt-1 text-[10px] text-amber-500">click to filter →</span>
      </button>
    )
  }
  return (
    <div className={`${base} border-zinc-200 bg-white`}>
      <span className={`text-3xl font-extrabold leading-none ${accent}`}>{value}</span>
      <span className="mt-1.5 text-center text-xs font-medium text-zinc-400">{label}</span>
    </div>
  )
}

function weekKey(date: Date): string {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return monday.toISOString().split('T')[0]
}

function formatWeekLabel(isoMonday: string): string {
  const d = new Date(isoMonday + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function StatsPanel() {
  const { data, setSelectedJobId, setStarFilter } = useStore()
  const router = useRouter()

  if (data.jobs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-sm text-zinc-400">
        No applications yet — click + Add Job to get started.
      </div>
    )
  }

  // ── Stat card values ────────────────────────────────────────────────────────
  const totalCompanies = data.companies.length
  const totalJobs = data.jobs.length
  const fiveStarCount = data.jobs.filter((j) => j.matchLevel === 5).length
  const activeCount = data.jobs.filter(
    (j) => j.status !== 'rejected' && j.status !== 'accepted'
  ).length

  // ── Pipeline funnel ────────────────────────────────────────────────────────
  const funnelData = JOB_STATUSES.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    count: data.jobs.filter((j) => j.status === s).length,
  }))

  function conversionRate(fromStatus: JobStatus, toStatus: JobStatus): string {
    const from = data.jobs.filter((j) => j.status === fromStatus).length
    const to = data.jobs.filter((j) => j.status === toStatus).length
    if (from === 0) return '—'
    return `${Math.round((to / from) * 100)}%`
  }

  // ── Dream Jobs ─────────────────────────────────────────────────────────────
  const dreamJobs = data.jobs
    .filter((j) => j.matchLevel === 5)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))

  // ── Recent Activity ────────────────────────────────────────────────────────
  const recentEvents = [...data.timelineEvents]
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)

  // ── Upcoming Interviews ────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingInterviews = data.interviews
    .filter((i) => i.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  // ── Activity chart — last 8 weeks ──────────────────────────────────────────
  const today = new Date()
  const weeks: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i * 7)
    weeks.push(weekKey(d))
  }
  const weekCounts: Record<string, number> = {}
  for (const w of weeks) weekCounts[w] = 0
  for (const job of data.jobs) {
    const d = new Date(job.appliedAt + 'T00:00:00')
    const k = weekKey(d)
    if (k in weekCounts) weekCounts[k]++
  }
  const activityData = weeks.map((w) => ({
    week: formatWeekLabel(w),
    count: weekCounts[w],
  }))

  // ── Status breakdown ───────────────────────────────────────────────────────
  const statusData = JOB_STATUSES.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    count: data.jobs.filter((j) => j.status === s).length,
  }))

  // ── Top companies ──────────────────────────────────────────────────────────
  const companyCounts = data.companies
    .map((c) => ({
      name: c.name,
      count: data.jobs.filter((j) => j.companyId === c.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const showTopCompanies = companyCounts.length >= 1

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Overview</h2>
          <p className="mt-0.5 text-sm text-zinc-400">Your job search at a glance</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard value={totalCompanies} label="Companies" accent="text-blue-600" />
          <StatCard value={totalJobs} label="Total Jobs" />
          <StatCard
            value={fiveStarCount}
            label="5-Star Rated"
            accent="text-amber-500"
            onClick={() => {
              setStarFilter(5)
              router.push('/dashboard')
            }}
          />
          <StatCard value={activeCount} label="Active" accent="text-green-600" />
        </div>

        {/* Pipeline Funnel */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-700">Pipeline Funnel</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={funnelData} barSize={28}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                width={20}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: '#f4f4f5' }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e4e4e7',
                  fontSize: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Jobs">
                {funnelData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_HEX[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
            <span>Applied → Phone: <strong className="text-zinc-600">{conversionRate('applied', 'phone_screen')}</strong></span>
            <span>Phone → Tech: <strong className="text-zinc-600">{conversionRate('phone_screen', 'technical_interview')}</strong></span>
            <span>Tech → Onsite: <strong className="text-zinc-600">{conversionRate('technical_interview', 'onsite')}</strong></span>
            <span>Onsite → Offer: <strong className="text-zinc-600">{conversionRate('onsite', 'offer')}</strong></span>
          </div>
        </div>

        {/* Dream Jobs */}
        {dreamJobs.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-zinc-700">⭐ Dream Jobs</p>
            <div className="flex flex-col gap-2">
              {dreamJobs.map((job) => {
                const company = data.companies.find((c) => c.id === job.companyId)
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => { setSelectedJobId(job.id); router.push('/dashboard') }}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-left hover:bg-amber-100 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-zinc-800">
                        {company?.name} — {job.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-amber-700">
                        {STATUS_LABELS[job.status]} · {new Date(job.appliedAt + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      Open →
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentEvents.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-zinc-700">Recent Activity</p>
            <div className="flex flex-col gap-3">
              {recentEvents.map((event) => {
                const job = data.jobs.find((j) => j.id === event.jobId)
                const company = job ? data.companies.find((c) => c.id === job.companyId) : undefined
                if (!job) return null
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => { setSelectedJobId(job.id); router.push('/dashboard') }}
                    className="flex items-start gap-2.5 text-left hover:opacity-75 transition-opacity"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[job.status]}`} />
                    <div>
                      <span className="text-xs font-semibold text-zinc-800">{company?.name}</span>
                      <span className="text-xs text-zinc-500"> — {event.title}</span>
                      <div className="mt-0.5 text-[11px] text-zinc-400">
                        {new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Upcoming Interviews */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-zinc-700">Upcoming Interviews</p>
          {upcomingInterviews.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-3">No interviews scheduled yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingInterviews.map((interview) => {
                const job = data.jobs.find((j) => j.id === interview.jobId)
                const company = job ? data.companies.find((c) => c.id === job.companyId) : undefined
                if (!job) return null
                const displayDate = new Date(interview.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })
                return (
                  <button
                    key={interview.id}
                    type="button"
                    onClick={() => { setSelectedJobId(job.id); router.push('/dashboard') }}
                    className="flex items-start gap-3 text-left hover:opacity-75 transition-opacity"
                  >
                    <span className="shrink-0 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                      {INTERVIEW_TYPE_LABELS[interview.type]}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-zinc-800">
                        {company?.name} — {job.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        {displayDate} · {interview.time}
                        {interview.link && (
                          <a
                            href={interview.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="ml-2 text-blue-500 hover:underline"
                          >
                            Join →
                          </a>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Application activity */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-700">
            Application Activity <span className="font-normal text-zinc-400">(last 8 weeks)</span>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={activityData} barSize={24}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                width={20}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: '#f4f4f5' }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e4e4e7',
                  fontSize: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-700">Status Breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData} layout="vertical" barSize={18} margin={{ left: 0, right: 16 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                cursor={{ fill: '#f4f4f5' }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e4e4e7',
                  fontSize: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Jobs">
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_HEX[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top companies */}
        {showTopCompanies && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-zinc-700">Top Companies</p>
            <ResponsiveContainer width="100%" height={companyCounts.length * 34 + 8}>
              <BarChart data={companyCounts} layout="vertical" barSize={18} margin={{ left: 0, right: 16 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e4e4e7',
                    fontSize: 12,
                    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Jobs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
