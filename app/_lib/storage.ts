import { v4 as uuidv4 } from 'uuid'
import type { AppData } from './types'

// Legacy localStorage key. Data now lives in IndexedDB (localStorage caps at
// ~5MB, which job descriptions + CV snapshots outgrew); this key is only read
// once to migrate existing data.
export const STORAGE_KEY = 'job-tracker-data'

// Other tabs are notified of saves on this channel (IndexedDB has no
// equivalent of the `storage` event).
export const SYNC_CHANNEL = 'job-tracker-data'

const DB_NAME = 'job-tracker'
const DB_STORE = 'kv'
const DB_KEY = 'data'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(parsed: any): AppData {
  return {
    ...parsed,
    // Migrate jobs created before requiresGerman field was added
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
}

// One shared connection so readwrite transactions run in the order saves were made.
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).catch(err => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

async function idbGet(): Promise<unknown> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(DB_KEY)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(value: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).put(value, DB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadData(): Promise<AppData> {
  if (typeof window === 'undefined') return DEFAULT_DATA
  try {
    let raw = (await idbGet()) as string | undefined
    if (!raw) {
      // One-time migration from localStorage
      raw = localStorage.getItem(STORAGE_KEY) ?? undefined
      if (!raw) return DEFAULT_DATA
      await idbPut(raw)
      localStorage.removeItem(STORAGE_KEY)
    }
    return normalize(JSON.parse(raw))
  } catch {
    return DEFAULT_DATA
  }
}

let channel: BroadcastChannel | null = null

export function getSyncChannel(): BroadcastChannel {
  channel ??= new BroadcastChannel(SYNC_CHANNEL)
  return channel
}

export async function saveData(data: AppData): Promise<void> {
  if (typeof window === 'undefined') return
  // Stored as a JSON string: drops `undefined` fields exactly like the old
  // localStorage format and avoids structured-clone surprises.
  await idbPut(JSON.stringify(data))
  getSyncChannel().postMessage('saved')
}
