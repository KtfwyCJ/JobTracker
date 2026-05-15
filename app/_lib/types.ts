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

export interface AppData {
  companies: Company[]
  jobs: Job[]
  timelineEvents: TimelineEvent[]
  interviews: Interview[]
  waitlist: WaitlistEntry[]
}
