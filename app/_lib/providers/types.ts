import type { JobPosting } from '../jobSearch'

export type AtsPlatform = 'greenhouse' | 'ashby' | 'lever' | 'smartrecruiters' | 'personio' | 'workday'

export interface AtsMapping {
  platform: AtsPlatform
  board: string
}

export interface Provider {
  id: AtsPlatform
  /** Matches a career-portal URL or page HTML; capture group 1 is the board slug. */
  detectPattern: RegExp
  fetchJobs(board: string, companyName: string): Promise<JobPosting[]>
}
