'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  AppData,
  Company,
  Interview,
  Job,
  JobStatus,
  TimelineEvent,
  WaitlistEntry,
} from './types'
import { loadData, saveData } from './storage'

// ── Actions ──────────────────────────────────────────────────────────────────

type JobFields = { companyName: string; title: string; description: string; location: string; appliedAt: string; requiresGerman: boolean; jobPostingId?: string; jobLink?: string; matchLevel?: number }

type Action =
  | { type: 'LOAD'; payload: AppData }
  | { type: 'ADD_JOB'; payload: JobFields }
  | { type: 'UPDATE_JOB'; payload: { jobId: string } & JobFields }
  | { type: 'DELETE_JOB'; payload: { jobId: string } }
  | { type: 'UPDATE_JOB_STATUS'; payload: { jobId: string; status: JobStatus } }
  | { type: 'UPDATE_JOB_LANGUAGE'; payload: { jobId: string; requiresGerman: boolean } }
  | { type: 'UPDATE_JOB_MATCH'; payload: { jobId: string; matchLevel: number } }
  | { type: 'ADD_TIMELINE_EVENT'; payload: { jobId: string; title: string; note: string; eventDate: string } }
  | { type: 'UPDATE_TIMELINE_EVENT'; payload: { eventId: string; title: string; note: string; eventDate: string } }
  | { type: 'DELETE_TIMELINE_EVENT'; payload: { eventId: string } }
  | { type: 'ADD_INTERVIEW'; payload: Omit<Interview, 'id' | 'createdAt'> }
  | { type: 'UPDATE_INTERVIEW'; payload: { id: string } & Partial<Omit<Interview, 'id' | 'createdAt'>> }
  | { type: 'DELETE_INTERVIEW'; payload: { id: string } }
  | { type: 'ADD_WAITLIST_ENTRY'; payload: { companyName: string; jobTitle: string; jobPostingId?: string; jobLink?: string; matchLevel?: number } }
  | { type: 'DELETE_WAITLIST_ENTRY'; payload: { id: string } }
  | { type: 'UPDATE_WAITLIST_MATCH'; payload: { id: string; matchLevel: number } }
  | { type: 'PROMOTE_WAITLIST_ENTRY'; payload: { id: string } }

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'LOAD':
      return { ...action.payload, interviews: action.payload.interviews ?? [], waitlist: action.payload.waitlist ?? [] }

    case 'ADD_JOB': {
      const { companyName, title, description, location, appliedAt, requiresGerman, jobPostingId, jobLink, matchLevel } = action.payload
      const now = new Date().toISOString()

      let company = state.companies.find(
        (c) => c.name.toLowerCase() === companyName.toLowerCase()
      )
      let companies = state.companies
      if (!company) {
        company = { id: uuidv4(), name: companyName, createdAt: now }
        companies = [...state.companies, company]
      }

      const job: Job = {
        id: uuidv4(),
        companyId: company.id,
        title,
        description,
        location,
        status: 'applied',
        appliedAt,
        createdAt: now,
        requiresGerman,
        jobPostingId,
        jobLink,
        matchLevel,
      }

      const initialEvent: TimelineEvent = {
        id: uuidv4(),
        jobId: job.id,
        title: 'Applied',
        note: '',
        eventDate: appliedAt,
        createdAt: now,
      }

      return {
        ...state,
        companies,
        jobs: [...state.jobs, job],
        timelineEvents: [...state.timelineEvents, initialEvent],
      }
    }

    case 'UPDATE_JOB': {
      const { jobId, companyName, title, description, location, appliedAt, requiresGerman, jobPostingId, jobLink, matchLevel } = action.payload
      const now = new Date().toISOString()

      let company = state.companies.find(
        (c) => c.name.toLowerCase() === companyName.toLowerCase()
      )
      let companies = state.companies
      if (!company) {
        company = { id: uuidv4(), name: companyName, createdAt: now }
        companies = [...state.companies, company]
      }

      return {
        ...state,
        companies,
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? { ...j, companyId: company!.id, title, description, location, appliedAt, requiresGerman, jobPostingId, jobLink, matchLevel }
            : j
        ),
      }
    }

    case 'DELETE_JOB': {
      const { jobId } = action.payload
      return {
        ...state,
        jobs: state.jobs.filter((j) => j.id !== jobId),
        timelineEvents: state.timelineEvents.filter((e) => e.jobId !== jobId),
        interviews: state.interviews.filter((i) => i.jobId !== jobId),
      }
    }

    case 'UPDATE_JOB_STATUS': {
      const { jobId, status } = action.payload
      const now = new Date().toISOString()

      const statusLabel: Record<JobStatus, string> = {
        applied: 'Applied',
        phone_screen: 'Phone Screen',
        technical_interview: 'Technical Interview',
        onsite: 'Onsite',
        offer: 'Offer',
        accepted: 'Accepted',
        rejected: 'Rejected',
      }

      const newEvent: TimelineEvent = {
        id: uuidv4(),
        jobId,
        title: `Status updated to ${statusLabel[status]}`,
        note: '',
        eventDate: now.split('T')[0],
        createdAt: now,
      }

      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
        timelineEvents: [...state.timelineEvents, newEvent],
      }
    }

    case 'ADD_TIMELINE_EVENT': {
      const { jobId, title, note, eventDate } = action.payload
      const event: TimelineEvent = {
        id: uuidv4(),
        jobId,
        title,
        note,
        eventDate,
        createdAt: new Date().toISOString(),
      }
      return { ...state, timelineEvents: [...state.timelineEvents, event] }
    }

    case 'UPDATE_TIMELINE_EVENT': {
      const { eventId, title, note, eventDate } = action.payload
      return {
        ...state,
        timelineEvents: state.timelineEvents.map((e) =>
          e.id === eventId ? { ...e, title, note, eventDate } : e
        ),
      }
    }

    case 'DELETE_TIMELINE_EVENT':
      return {
        ...state,
        timelineEvents: state.timelineEvents.filter((e) => e.id !== action.payload.eventId),
      }

    case 'ADD_INTERVIEW': {
      const interview: Interview = {
        ...action.payload,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      }
      return { ...state, interviews: [...state.interviews, interview] }
    }

    case 'UPDATE_INTERVIEW': {
      const { id, ...patch } = action.payload
      return {
        ...state,
        interviews: state.interviews.map((i) =>
          i.id === id ? { ...i, ...patch } : i
        ),
      }
    }

    case 'DELETE_INTERVIEW':
      return {
        ...state,
        interviews: state.interviews.filter((i) => i.id !== action.payload.id),
      }

    case 'UPDATE_JOB_LANGUAGE': {
      const { jobId, requiresGerman } = action.payload
      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, requiresGerman } : j)),
      }
    }

    case 'UPDATE_JOB_MATCH': {
      const { jobId, matchLevel } = action.payload
      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, matchLevel: matchLevel === 0 ? undefined : matchLevel } : j)),
      }
    }

    case 'ADD_WAITLIST_ENTRY': {
      const { companyName, jobTitle, jobPostingId, jobLink, matchLevel } = action.payload
      const entry: WaitlistEntry = {
        id: uuidv4(),
        companyName,
        jobTitle,
        jobPostingId,
        jobLink,
        matchLevel,
        createdAt: new Date().toISOString(),
      }
      return { ...state, waitlist: [...state.waitlist, entry] }
    }

    case 'DELETE_WAITLIST_ENTRY':
      return { ...state, waitlist: state.waitlist.filter((e) => e.id !== action.payload.id) }

    case 'UPDATE_WAITLIST_MATCH': {
      const { id, matchLevel } = action.payload
      return {
        ...state,
        waitlist: state.waitlist.map((e) =>
          e.id === id ? { ...e, matchLevel: matchLevel === 0 ? undefined : matchLevel } : e
        ),
      }
    }

    case 'PROMOTE_WAITLIST_ENTRY': {
      const { id } = action.payload
      const entry = state.waitlist.find((e) => e.id === id)
      if (!entry) return state

      const now = new Date().toISOString()
      const today = now.split('T')[0]

      let company = state.companies.find(
        (c) => c.name.toLowerCase() === entry.companyName.toLowerCase()
      )
      let companies = state.companies
      if (!company) {
        company = { id: uuidv4(), name: entry.companyName, createdAt: now }
        companies = [...state.companies, company]
      }

      const job: Job = {
        id: uuidv4(),
        companyId: company.id,
        title: entry.jobTitle,
        description: '',
        location: '',
        status: 'applied',
        appliedAt: today,
        createdAt: now,
        requiresGerman: false,
        jobPostingId: entry.jobPostingId,
        jobLink: entry.jobLink,
        matchLevel: entry.matchLevel,
      }

      const initialEvent: TimelineEvent = {
        id: uuidv4(),
        jobId: job.id,
        title: 'Applied',
        note: '',
        eventDate: today,
        createdAt: now,
      }

      return {
        ...state,
        companies,
        jobs: [...state.jobs, job],
        timelineEvents: [...state.timelineEvents, initialEvent],
        waitlist: state.waitlist.filter((e) => e.id !== id),
      }
    }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface StoreContextValue {
  data: AppData
  selectedJobId: string | null
  setSelectedJobId: (id: string | null) => void
  editingJobId: string | null
  setEditingJobId: (id: string | null) => void
  search: string
  setSearch: (q: string) => void
  addJob: (payload: JobFields) => void
  updateJob: (payload: { jobId: string } & JobFields) => void
  deleteJob: (jobId: string) => void
  updateJobStatus: (jobId: string, status: JobStatus) => void
  updateJobLanguage: (jobId: string, requiresGerman: boolean) => void
  updateJobMatch: (jobId: string, matchLevel: number) => void
  addTimelineEvent: (jobId: string, title: string, note: string, eventDate: string) => void
  updateTimelineEvent: (eventId: string, title: string, note: string, eventDate: string) => void
  deleteTimelineEvent: (eventId: string) => void
  addInterview: (payload: Omit<Interview, 'id' | 'createdAt'>) => void
  updateInterview: (id: string, patch: Partial<Omit<Interview, 'id' | 'createdAt'>>) => void
  deleteInterview: (id: string) => void
  addWaitlistEntry: (payload: { companyName: string; jobTitle: string; jobPostingId?: string; jobLink?: string; matchLevel?: number }) => void
  deleteWaitlistEntry: (id: string) => void
  updateWaitlistMatch: (id: string, matchLevel: number) => void
  promoteWaitlistEntry: (id: string) => void
  getCompany: (id: string) => Company | undefined
  getJob: (id: string) => Job | undefined
  getJobEvents: (jobId: string) => TimelineEvent[]
  getInterviewsForMonth: (year: number, month: number) => Interview[]
  getInterviewsForWeek: (weekStart: Date) => Interview[]
  getJobsAppliedForMonth: (year: number, month: number) => Job[]
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, {
    companies: [],
    jobs: [],
    timelineEvents: [],
    interviews: [],
    waitlist: [],
  })
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    dispatch({ type: 'LOAD', payload: loadData() })
  }, [])

  useEffect(() => {
    saveData(data)
  }, [data])

  function addJob(payload: JobFields) {
    dispatch({ type: 'ADD_JOB', payload })
  }

  function updateJob(payload: { jobId: string } & JobFields) {
    dispatch({ type: 'UPDATE_JOB', payload })
  }

  function deleteJob(jobId: string) {
    dispatch({ type: 'DELETE_JOB', payload: { jobId } })
  }

  function updateJobLanguage(jobId: string, requiresGerman: boolean) {
    dispatch({ type: 'UPDATE_JOB_LANGUAGE', payload: { jobId, requiresGerman } })
  }

  function updateJobMatch(jobId: string, matchLevel: number) {
    dispatch({ type: 'UPDATE_JOB_MATCH', payload: { jobId, matchLevel } })
  }

  function addWaitlistEntry(payload: { companyName: string; jobTitle: string; jobPostingId?: string; jobLink?: string; matchLevel?: number }) {
    dispatch({ type: 'ADD_WAITLIST_ENTRY', payload })
  }

  function deleteWaitlistEntry(id: string) {
    dispatch({ type: 'DELETE_WAITLIST_ENTRY', payload: { id } })
  }

  function updateWaitlistMatch(id: string, matchLevel: number) {
    dispatch({ type: 'UPDATE_WAITLIST_MATCH', payload: { id, matchLevel } })
  }

  function promoteWaitlistEntry(id: string) {
    dispatch({ type: 'PROMOTE_WAITLIST_ENTRY', payload: { id } })
  }

  function updateJobStatus(jobId: string, status: JobStatus) {
    dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId, status } })
  }

  function addTimelineEvent(jobId: string, title: string, note: string, eventDate: string) {
    dispatch({ type: 'ADD_TIMELINE_EVENT', payload: { jobId, title, note, eventDate } })
  }

  function updateTimelineEvent(eventId: string, title: string, note: string, eventDate: string) {
    dispatch({ type: 'UPDATE_TIMELINE_EVENT', payload: { eventId, title, note, eventDate } })
  }

  function deleteTimelineEvent(eventId: string) {
    dispatch({ type: 'DELETE_TIMELINE_EVENT', payload: { eventId } })
  }

  function addInterview(payload: Omit<Interview, 'id' | 'createdAt'>) {
    dispatch({ type: 'ADD_INTERVIEW', payload })
  }

  function updateInterview(id: string, patch: Partial<Omit<Interview, 'id' | 'createdAt'>>) {
    dispatch({ type: 'UPDATE_INTERVIEW', payload: { id, ...patch } })
  }

  function deleteInterview(id: string) {
    dispatch({ type: 'DELETE_INTERVIEW', payload: { id } })
  }

  function getCompany(id: string) {
    return data.companies.find((c) => c.id === id)
  }

  function getJob(id: string) {
    return data.jobs.find((j) => j.id === id)
  }

  function getJobEvents(jobId: string) {
    return data.timelineEvents
      .filter((e) => e.jobId === jobId)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  }

  function getInterviewsForMonth(year: number, month: number): Interview[] {
    return data.interviews.filter((i) => {
      const d = new Date(i.date + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
  }

  function getJobsAppliedForMonth(year: number, month: number): Job[] {
    return data.jobs.filter((j) => {
      const d = new Date(j.appliedAt + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
  }

  function getInterviewsForWeek(weekStart: Date): Interview[] {
    const start = new Date(weekStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return data.interviews.filter((i) => {
      const d = new Date(i.date + 'T00:00:00')
      return d >= start && d < end
    })
  }

  return (
    <StoreContext.Provider
      value={{
        data,
        selectedJobId,
        setSelectedJobId,
        editingJobId,
        setEditingJobId,
        search,
        setSearch,
        addJob,
        updateJob,
        deleteJob,
        updateJobStatus,
        updateJobLanguage,
        updateJobMatch,
        addTimelineEvent,
        updateTimelineEvent,
        deleteTimelineEvent,
        addInterview,
        updateInterview,
        deleteInterview,
        addWaitlistEntry,
        deleteWaitlistEntry,
        updateWaitlistMatch,
        promoteWaitlistEntry,
        getCompany,
        getJob,
        getJobEvents,
        getInterviewsForMonth,
        getInterviewsForWeek,
        getJobsAppliedForMonth,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
