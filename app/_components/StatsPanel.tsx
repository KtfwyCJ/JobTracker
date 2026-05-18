'use client'

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
import { JOB_STATUSES, STATUS_LABELS, type JobStatus } from '../_lib/types'

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
}: {
  value: number
  label: string
  accent?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
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
  const { data } = useStore()

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
          <StatCard value={fiveStarCount} label="5-Star Rated" accent="text-amber-500" />
          <StatCard value={activeCount} label="Active" accent="text-green-600" />
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
