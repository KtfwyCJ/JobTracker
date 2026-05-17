import type { AppData } from './types'

const STORAGE_KEY = 'job-tracker-data'

const DEFAULT_DATA: AppData = {
  companies: [],
  jobs: [],
  timelineEvents: [],
  interviews: [],
  waitlist: [],
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
    } as AppData
  } catch {
    return DEFAULT_DATA
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
