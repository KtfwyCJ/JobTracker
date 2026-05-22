import { v4 as uuidv4 } from 'uuid'
import type { AppData } from './types'

const STORAGE_KEY = 'job-tracker-data'

const DEFAULT_DATA: AppData = {
  companies: [],
  jobs: [],
  timelineEvents: [],
  interviews: [],
  waitlist: [],
  learningResources: [],
  dailyLogs: [],
  interviewTips: [],
  plans: [],
  calendarEvents: [],
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return DEFAULT_DATA
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any
    return {
      ...parsed,
      // Migrate jobs created before requiresGerman field was added
      jobs: (parsed.jobs ?? []).map((j: any) => ({ requiresGerman: false, analysis: undefined, ...j })),
      waitlist: parsed.waitlist ?? [],
      learningResources: parsed.learningResources ?? [],
      dailyLogs: parsed.dailyLogs ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interviewTips: (parsed.interviewTips ?? []).map((t: any) => ({ guide: '', ...t })),
      plans: (() => {
        if (parsed.plans && parsed.plans.length > 0) return parsed.plans
        // Migrate single planDocument to first plan
        if (parsed.planDocument && typeof parsed.planDocument === 'string' && parsed.planDocument.trim()) {
          const now = new Date().toISOString()
          return [{ id: uuidv4(), title: 'My Plan', content: parsed.planDocument, createdAt: now, updatedAt: now }]
        }
        return []
      })(),
      calendarEvents: parsed.calendarEvents ?? [],
    } as AppData
  } catch {
    return DEFAULT_DATA
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
