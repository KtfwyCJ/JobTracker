'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  AppData,
  Company,
  DailyLog,
  Interview,
  InterviewTip,
  Job,
  JobStatus,
  LearningResource,
  LearningResourceStatus,
  PrepItem,
  PrepQuestion,
  PrepSource,
  QuestionKind,
  TimelineEvent,
  WaitlistEntry,
} from './types'
import { loadData, saveData } from './storage'

// ── Actions ──────────────────────────────────────────────────────────────────

type JobFields = { companyName: string; title: string; description: string; location: string; appliedAt: string; requiresGerman: boolean; jobPostingId?: string; jobLink?: string; matchLevel?: number; analysis?: string }

type Action =
  | { type: 'LOAD'; payload: AppData }
  | { type: 'ADD_JOB'; payload: JobFields }
  | { type: 'UPDATE_JOB'; payload: { jobId: string } & JobFields }
  | { type: 'DELETE_JOB'; payload: { jobId: string } }
  | { type: 'UPDATE_JOB_STATUS'; payload: { jobId: string; status: JobStatus; note?: string } }
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
  | { type: 'UPDATE_REJECTION_EMAIL'; payload: { jobId: string; rejectionEmail: string } }
  | { type: 'ADD_LEARNING_RESOURCE'; payload: Omit<LearningResource, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_LEARNING_RESOURCE'; payload: { id: string } & Partial<Omit<LearningResource, 'id' | 'createdAt'>> }
  | { type: 'DELETE_LEARNING_RESOURCE'; payload: { id: string } }
  | { type: 'UPSERT_DAILY_LOG'; payload: { date: string } }
  | { type: 'ADD_LOG_ITEM'; payload: { date: string; section: 'done' | 'plan'; text: string } }
  | { type: 'TOGGLE_LOG_ITEM'; payload: { date: string; section: 'done' | 'plan'; itemId: string } }
  | { type: 'DELETE_LOG_ITEM'; payload: { date: string; section: 'done' | 'plan'; itemId: string } }
  | { type: 'ADD_INTERVIEW_TIP'; payload: { id: string; company: string; position: string; linkedJobId?: string } }
  | { type: 'UPDATE_INTERVIEW_TIP'; payload: { id: string } & Partial<Omit<InterviewTip, 'id' | 'createdAt'>> }
  | { type: 'DELETE_INTERVIEW_TIP'; payload: { id: string } }
  | { type: 'ADD_TIP_QUESTION'; payload: { tipId: string; kind: QuestionKind; text: string; url?: string } }
  | { type: 'DELETE_TIP_QUESTION'; payload: { tipId: string; questionId: string } }
  | { type: 'ADD_TIP_SOURCE'; payload: { tipId: string; label: string; url?: string } }
  | { type: 'DELETE_TIP_SOURCE'; payload: { tipId: string; sourceId: string } }
  | { type: 'TOGGLE_TIP_ITEM'; payload: { tipId: string; itemId: string } }
  | { type: 'ADD_TIP_ITEM'; payload: { tipId: string; text: string } }
  | { type: 'DELETE_TIP_ITEM'; payload: { tipId: string; itemId: string } }

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'LOAD':
      return {
        ...action.payload,
        interviews: action.payload.interviews ?? [],
        waitlist: action.payload.waitlist ?? [],
        learningResources: action.payload.learningResources ?? [],
        dailyLogs: action.payload.dailyLogs ?? [],
        interviewTips: action.payload.interviewTips ?? [],
      }

    case 'ADD_JOB': {
      const { companyName, title, description, location, appliedAt, requiresGerman, jobPostingId, jobLink, matchLevel, analysis } = action.payload
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
        analysis,
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
      const { jobId, companyName, title, description, location, appliedAt, requiresGerman, jobPostingId, jobLink, matchLevel, analysis } = action.payload
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
            ? { ...j, companyId: company!.id, title, description, location, appliedAt, requiresGerman, jobPostingId, jobLink, matchLevel, analysis }
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
      const { jobId, status, note } = action.payload
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
        note: note ?? '',
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

    case 'UPDATE_REJECTION_EMAIL': {
      const { jobId, rejectionEmail } = action.payload
      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, rejectionEmail } : j)),
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
        analysis: undefined,
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

    case 'ADD_LEARNING_RESOURCE': {
      const now = new Date().toISOString()
      const resource: LearningResource = {
        ...action.payload,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      }
      return { ...state, learningResources: [...state.learningResources, resource] }
    }

    case 'UPDATE_LEARNING_RESOURCE': {
      const { id, ...patch } = action.payload
      return {
        ...state,
        learningResources: state.learningResources.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
        ),
      }
    }

    case 'DELETE_LEARNING_RESOURCE':
      return {
        ...state,
        learningResources: state.learningResources.filter((r) => r.id !== action.payload.id),
      }

    case 'UPSERT_DAILY_LOG': {
      const { date } = action.payload
      if (state.dailyLogs.find((l) => l.date === date)) return state
      const now = new Date().toISOString()
      const log: DailyLog = {
        id: uuidv4(),
        date,
        doneItems: [],
        planItems: [],
        createdAt: now,
        updatedAt: now,
      }
      return { ...state, dailyLogs: [...state.dailyLogs, log] }
    }

    case 'ADD_LOG_ITEM': {
      const { date, section, text } = action.payload
      const item = { id: uuidv4(), text, done: false }
      return {
        ...state,
        dailyLogs: state.dailyLogs.map((l) => {
          if (l.date !== date) return l
          return section === 'done'
            ? { ...l, doneItems: [...l.doneItems, item], updatedAt: new Date().toISOString() }
            : { ...l, planItems: [...l.planItems, item], updatedAt: new Date().toISOString() }
        }),
      }
    }

    case 'TOGGLE_LOG_ITEM': {
      const { date, section, itemId } = action.payload
      return {
        ...state,
        dailyLogs: state.dailyLogs.map((l) => {
          if (l.date !== date) return l
          const toggle = (items: DailyLog['doneItems']) =>
            items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
          return section === 'done'
            ? { ...l, doneItems: toggle(l.doneItems), updatedAt: new Date().toISOString() }
            : { ...l, planItems: toggle(l.planItems), updatedAt: new Date().toISOString() }
        }),
      }
    }

    case 'DELETE_LOG_ITEM': {
      const { date, section, itemId } = action.payload
      return {
        ...state,
        dailyLogs: state.dailyLogs.map((l) => {
          if (l.date !== date) return l
          const remove = (items: DailyLog['doneItems']) => items.filter((i) => i.id !== itemId)
          return section === 'done'
            ? { ...l, doneItems: remove(l.doneItems), updatedAt: new Date().toISOString() }
            : { ...l, planItems: remove(l.planItems), updatedAt: new Date().toISOString() }
        }),
      }
    }

    case 'ADD_INTERVIEW_TIP': {
      const { id, company, position, linkedJobId } = action.payload
      const now = new Date().toISOString()
      const defaultChecklist: PrepItem[] = [
        { id: uuidv4(), text: 'Research company culture & values', done: false },
        { id: uuidv4(), text: 'Prepare 3 STAR stories', done: false },
        { id: uuidv4(), text: 'Review the job description thoroughly', done: false },
        { id: uuidv4(), text: 'Prepare questions to ask the interviewer', done: false },
        { id: uuidv4(), text: 'Test meeting link / check tech setup', done: false },
        { id: uuidv4(), text: 'Review your resume talking points', done: false },
      ]
      const tip: InterviewTip = {
        id,
        company,
        position,
        linkedJobId,
        notes: '',
        questions: [],
        sources: [],
        checklist: defaultChecklist,
        createdAt: now,
        updatedAt: now,
      }
      return { ...state, interviewTips: [...state.interviewTips, tip] }
    }

    case 'UPDATE_INTERVIEW_TIP': {
      const { id, ...patch } = action.payload
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
        ),
      }
    }

    case 'DELETE_INTERVIEW_TIP':
      return {
        ...state,
        interviewTips: state.interviewTips.filter((t) => t.id !== action.payload.id),
      }

    case 'ADD_TIP_QUESTION': {
      const { tipId, kind, text, url } = action.payload
      const question: PrepQuestion = { id: uuidv4(), kind, text, url }
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === tipId
            ? { ...t, questions: [...t.questions, question], updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }

    case 'DELETE_TIP_QUESTION': {
      const { tipId, questionId } = action.payload
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === tipId
            ? { ...t, questions: t.questions.filter((q) => q.id !== questionId), updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }

    case 'ADD_TIP_SOURCE': {
      const { tipId, label, url } = action.payload
      const source: PrepSource = { id: uuidv4(), label, url }
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === tipId
            ? { ...t, sources: [...t.sources, source], updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }

    case 'DELETE_TIP_SOURCE': {
      const { tipId, sourceId } = action.payload
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === tipId
            ? { ...t, sources: t.sources.filter((s) => s.id !== sourceId), updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }

    case 'TOGGLE_TIP_ITEM': {
      const { tipId, itemId } = action.payload
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === tipId
            ? {
                ...t,
                checklist: t.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }
    }

    case 'ADD_TIP_ITEM': {
      const { tipId, text } = action.payload
      const item: PrepItem = { id: uuidv4(), text, done: false }
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === tipId
            ? { ...t, checklist: [...t.checklist, item], updatedAt: new Date().toISOString() }
            : t
        ),
      }
    }

    case 'DELETE_TIP_ITEM': {
      const { tipId, itemId } = action.payload
      return {
        ...state,
        interviewTips: state.interviewTips.map((t) =>
          t.id === tipId
            ? { ...t, checklist: t.checklist.filter((i) => i.id !== itemId), updatedAt: new Date().toISOString() }
            : t
        ),
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
  starFilter: number | null
  setStarFilter: (n: number | null) => void
  addJob: (payload: JobFields) => void
  updateJob: (payload: { jobId: string } & JobFields) => void
  deleteJob: (jobId: string) => void
  updateJobStatus: (jobId: string, status: JobStatus, note?: string) => void
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
  updateRejectionEmail: (jobId: string, rejectionEmail: string) => void
  addLearningResource: (payload: Omit<LearningResource, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateLearningResource: (id: string, patch: Partial<Omit<LearningResource, 'id' | 'createdAt'>>) => void
  deleteLearningResource: (id: string) => void
  upsertDailyLog: (date: string) => void
  addLogItem: (date: string, section: 'done' | 'plan', text: string) => void
  toggleLogItem: (date: string, section: 'done' | 'plan', itemId: string) => void
  deleteLogItem: (date: string, section: 'done' | 'plan', itemId: string) => void
  getDailyLog: (date: string) => DailyLog | undefined
  addInterviewTip: (company: string, position: string, linkedJobId?: string) => string
  updateInterviewTip: (id: string, patch: Partial<Omit<InterviewTip, 'id' | 'createdAt'>>) => void
  deleteInterviewTip: (id: string) => void
  addTipQuestion: (tipId: string, kind: QuestionKind, text: string, url?: string) => void
  deleteTipQuestion: (tipId: string, questionId: string) => void
  addTipSource: (tipId: string, label: string, url?: string) => void
  deleteTipSource: (tipId: string, sourceId: string) => void
  toggleTipItem: (tipId: string, itemId: string) => void
  addTipItem: (tipId: string, text: string) => void
  deleteTipItem: (tipId: string, itemId: string) => void
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
    learningResources: [],
    dailyLogs: [],
    interviewTips: [],
  })
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')
  const [starFilter, setStarFilter] = useState<number | null>(null)
  const hydrated = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Show localStorage data immediately so the UI is never blank
    dispatch({ type: 'LOAD', payload: loadData() })

    // Then fetch the authoritative file-based data
    fetch('/api/data')
      .then(r => r.ok ? r.json() : null)
      .then((fileData: AppData | null) => {
        // Only overwrite localStorage data if the file actually exists (r.ok)
        // A 404 means first run — keep localStorage as-is
        if (fileData !== null) {
          dispatch({ type: 'LOAD', payload: fileData })
        }
      })
      .catch(() => {
        // Server unavailable — localStorage data is already loaded
      })
      .finally(() => {
        hydrated.current = true
      })
  }, [])

  useEffect(() => {
    if (!hydrated.current) return

    saveData(data)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(err => console.error('[backup] Failed to sync data.json:', err))
    }, 500)
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

  function updateRejectionEmail(jobId: string, rejectionEmail: string) {
    dispatch({ type: 'UPDATE_REJECTION_EMAIL', payload: { jobId, rejectionEmail } })
  }

  function updateJobStatus(jobId: string, status: JobStatus, note?: string) {
    dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId, status, note } })
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

  function addLearningResource(payload: Omit<LearningResource, 'id' | 'createdAt' | 'updatedAt'>) {
    dispatch({ type: 'ADD_LEARNING_RESOURCE', payload })
  }

  function updateLearningResource(id: string, patch: Partial<Omit<LearningResource, 'id' | 'createdAt'>>) {
    dispatch({ type: 'UPDATE_LEARNING_RESOURCE', payload: { id, ...patch } })
  }

  function deleteLearningResource(id: string) {
    dispatch({ type: 'DELETE_LEARNING_RESOURCE', payload: { id } })
  }

  function upsertDailyLog(date: string) {
    dispatch({ type: 'UPSERT_DAILY_LOG', payload: { date } })
  }

  function addLogItem(date: string, section: 'done' | 'plan', text: string) {
    dispatch({ type: 'ADD_LOG_ITEM', payload: { date, section, text } })
  }

  function toggleLogItem(date: string, section: 'done' | 'plan', itemId: string) {
    dispatch({ type: 'TOGGLE_LOG_ITEM', payload: { date, section, itemId } })
  }

  function deleteLogItem(date: string, section: 'done' | 'plan', itemId: string) {
    dispatch({ type: 'DELETE_LOG_ITEM', payload: { date, section, itemId } })
  }

  function getDailyLog(date: string) {
    return data.dailyLogs.find((l) => l.date === date)
  }

  function addInterviewTip(company: string, position: string, linkedJobId?: string): string {
    const id = uuidv4()
    dispatch({ type: 'ADD_INTERVIEW_TIP', payload: { id, company, position, linkedJobId } })
    return id
  }

  function updateInterviewTip(id: string, patch: Partial<Omit<InterviewTip, 'id' | 'createdAt'>>) {
    dispatch({ type: 'UPDATE_INTERVIEW_TIP', payload: { id, ...patch } })
  }

  function deleteInterviewTip(id: string) {
    dispatch({ type: 'DELETE_INTERVIEW_TIP', payload: { id } })
  }

  function addTipQuestion(tipId: string, kind: QuestionKind, text: string, url?: string) {
    dispatch({ type: 'ADD_TIP_QUESTION', payload: { tipId, kind, text, url } })
  }

  function deleteTipQuestion(tipId: string, questionId: string) {
    dispatch({ type: 'DELETE_TIP_QUESTION', payload: { tipId, questionId } })
  }

  function addTipSource(tipId: string, label: string, url?: string) {
    dispatch({ type: 'ADD_TIP_SOURCE', payload: { tipId, label, url } })
  }

  function deleteTipSource(tipId: string, sourceId: string) {
    dispatch({ type: 'DELETE_TIP_SOURCE', payload: { tipId, sourceId } })
  }

  function toggleTipItem(tipId: string, itemId: string) {
    dispatch({ type: 'TOGGLE_TIP_ITEM', payload: { tipId, itemId } })
  }

  function addTipItem(tipId: string, text: string) {
    dispatch({ type: 'ADD_TIP_ITEM', payload: { tipId, text } })
  }

  function deleteTipItem(tipId: string, itemId: string) {
    dispatch({ type: 'DELETE_TIP_ITEM', payload: { tipId, itemId } })
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
        starFilter,
        setStarFilter,
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
        updateRejectionEmail,
        addLearningResource,
        updateLearningResource,
        deleteLearningResource,
        upsertDailyLog,
        addLogItem,
        toggleLogItem,
        deleteLogItem,
        getDailyLog,
        addInterviewTip,
        updateInterviewTip,
        deleteInterviewTip,
        addTipQuestion,
        deleteTipQuestion,
        addTipSource,
        deleteTipSource,
        toggleTipItem,
        addTipItem,
        deleteTipItem,
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
