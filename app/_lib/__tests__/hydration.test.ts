import { describe, it, expect } from 'vitest'
import { applyLoaded } from '../store'
import { isDestructiveWrite } from '../dataGuard'
import type { AppData } from '../types'

const empty: AppData = {
  companies: [], jobs: [], timelineEvents: [], interviews: [], waitlist: [], learningResources: [],
  dailyLogs: [], interviewTips: [], plans: [], calendarEvents: [],
} as unknown as AppData

const full = {
  ...empty,
  companies: [{ id: 'c1', name: 'SAP', createdAt: '2026-05-18' }],
  jobs: [{ id: 'j1', companyId: 'c1', title: 'Eng', status: 'applied', createdAt: '2026-05-18', appliedAt: '2026-05-18' }],
  dailyLogs: [{ id: 'd1', date: '2026-05-18', doneItems: [], planItems: [], createdAt: 'x', updatedAt: 'x' }],
} as unknown as AppData

describe('applyLoaded (store hydration)', () => {
  it('keeps the loaded data when a page auto-dispatched before hydration finished (the /learn wipe)', () => {
    const r = applyLoaded(full, [{ type: 'UPSERT_DAILY_LOG', payload: { date: '2026-11-23' } }])
    expect(r.jobs).toHaveLength(1)
    expect(r.companies).toHaveLength(1)
    expect(r.dailyLogs.map((l) => l.date)).toEqual(['2026-05-18', '2026-11-23'])
  })
  it('with no pending actions returns the loaded data', () => {
    expect(applyLoaded(full, []).jobs).toHaveLength(1)
  })
  it('replays a real user edit made during hydration on top of the loaded data', () => {
    const r = applyLoaded(full, [{ type: 'UPDATE_JOB_MATCH', payload: { jobId: 'j1', matchLevel: 5 } }])
    expect(r.jobs[0].matchLevel).toBe(5)
  })
})

describe('isDestructiveWrite (data.json guard)', () => {
  const jobs = (n: number) => ({ jobs: Array.from({ length: n }, (_, i) => ({ id: `j${i}` })) })
  it('blocks replacing many jobs with (almost) none', () => {
    expect(isDestructiveWrite(jobs(343), jobs(0))).toBe(true)
    expect(isDestructiveWrite(jobs(343), jobs(100))).toBe(true)
  })
  it('allows normal edits, single deletes and first runs', () => {
    expect(isDestructiveWrite(jobs(343), jobs(342))).toBe(false)
    expect(isDestructiveWrite(jobs(343), jobs(344))).toBe(false)
    expect(isDestructiveWrite(null, jobs(0))).toBe(false)
    expect(isDestructiveWrite(jobs(3), jobs(0))).toBe(false)
  })
  it('treats a payload without a jobs array as destructive when data exists', () => {
    expect(isDestructiveWrite(jobs(343), {})).toBe(true)
  })
})
