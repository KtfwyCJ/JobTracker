export type JobStatus =
  | 'applied'
  | 'phone_screen'
  | 'technical_interview'
  | 'onsite'
  | 'offer'
  | 'accepted'
  | 'rejected'

export const JOB_STATUSES: JobStatus[] = [
  'applied',
  'phone_screen',
  'technical_interview',
  'onsite',
  'offer',
  'accepted',
  'rejected',
]

export const STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  technical_interview: 'Technical Interview',
  onsite: 'Onsite',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

export const STATUS_COLORS: Record<JobStatus, string> = {
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  phone_screen: 'bg-purple-100 text-purple-700 border-purple-200',
  technical_interview: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  onsite: 'bg-orange-100 text-orange-700 border-orange-200',
  offer: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

export const STATUS_DOT_COLORS: Record<JobStatus, string> = {
  applied: 'bg-blue-500',
  phone_screen: 'bg-purple-500',
  technical_interview: 'bg-cyan-500',
  onsite: 'bg-orange-500',
  offer: 'bg-amber-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
}

export interface Company {
  id: string
  name: string
  createdAt: string
}

export interface Job {
  id: string
  companyId: string
  title: string
  description: string
  location: string
  status: JobStatus
  appliedAt: string
  createdAt: string
  requiresGerman: boolean
  jobPostingId?: string
  jobLink?: string
  matchLevel?: number   // 1–5; undefined = unrated
  analysis?: string
  rejectionEmail?: string
}

export interface WaitlistEntry {
  id: string
  companyName: string
  jobTitle: string
  jobPostingId?: string
  jobLink?: string
  matchLevel?: number   // 1–5; undefined = unrated
  createdAt: string
}

export interface TimelineEvent {
  id: string
  jobId: string
  title: string
  note: string
  eventDate: string
  createdAt: string
}

export type InterviewType = 'phone_screen' | 'technical_interview' | 'onsite'

export const INTERVIEW_TYPES: InterviewType[] = ['phone_screen', 'technical_interview', 'onsite']

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone_screen: 'Phone Screen',
  technical_interview: 'Technical Interview',
  onsite: 'Onsite',
}

export const INTERVIEW_DURATIONS = [30, 60, 90, 120] as const

export interface Interview {
  id: string
  jobId: string
  type: InterviewType
  date: string        // YYYY-MM-DD
  time: string        // HH:MM (24h)
  duration: number    // minutes
  interviewer: string
  link: string
  notes: string
  createdAt: string
}

export type LearningResourceType = 'book' | 'repo' | 'article' | 'project' | 'other'
export type LearningResourceStatus = 'want_to_learn' | 'in_progress' | 'done'

export const LEARNING_RESOURCE_TYPES: LearningResourceType[] = ['book', 'repo', 'article', 'project', 'other']
export const LEARNING_RESOURCE_TYPE_LABELS: Record<LearningResourceType, string> = {
  book: 'Book',
  repo: 'Repo',
  article: 'Article',
  project: 'Project',
  other: 'Other',
}

export const LEARNING_RESOURCE_STATUS_LABELS: Record<LearningResourceStatus, string> = {
  want_to_learn: 'Want to Learn',
  in_progress: 'In Progress',
  done: 'Done',
}

export const LEARNING_RESOURCE_STATUS_COLORS: Record<LearningResourceStatus, string> = {
  want_to_learn: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

export interface LearningResource {
  id: string
  title: string
  type: LearningResourceType
  url?: string
  author?: string
  status: LearningResourceStatus
  notes?: string
  linkedJobIds: string[]
  createdAt: string
  updatedAt: string
}

export interface DailyLogItem {
  id: string
  text: string
  done: boolean
}

export interface DailyLog {
  id: string
  date: string
  doneItems: DailyLogItem[]
  planItems: DailyLogItem[]
  createdAt: string
  updatedAt: string
}

export type QuestionKind = 'text' | 'link'

export interface PrepQuestion {
  id: string
  kind: QuestionKind
  text: string
  url?: string
}

export interface PrepSource {
  id: string
  label: string
  url?: string
}

export interface PrepItem {
  id: string
  text: string
  done: boolean
}

export interface InterviewTip {
  id: string
  company: string
  position: string
  linkedJobId?: string
  notes: string
  questions: PrepQuestion[]
  sources: PrepSource[]
  checklist: PrepItem[]
  guide: string
  createdAt: string
  updatedAt: string
}

export interface Plan {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string        // YYYY-MM-DD
  time: string        // HH:MM (24h)
  duration: number    // minutes
  description: string
  createdAt: string
}

export interface AppData {
  companies: Company[]
  jobs: Job[]
  timelineEvents: TimelineEvent[]
  interviews: Interview[]
  waitlist: WaitlistEntry[]
  learningResources: LearningResource[]
  dailyLogs: DailyLog[]
  interviewTips: InterviewTip[]
  plans: Plan[]
  calendarEvents: CalendarEvent[]
}
