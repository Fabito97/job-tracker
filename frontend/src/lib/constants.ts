import type { JobFilters } from '@/types'

export const HIGH_MATCH_SCORE = 80
export const PAGE_SIZE = 20

export const QUERY_KEYS = {
  jobs: 'jobs',
  job: 'job',
  metrics: 'metrics',
  boards: 'boards',
  scrapeDefaults: 'scrape-defaults',
  settings: 'settings',
  resumes: 'resumes',
} as const

export interface Tab {
  label: string
  filter: Pick<JobFilters, 'status' | 'minScore'>
}

/** Tabs only preset the status and score, so the filter bar below stays in sync with them. */
export const TABS: Tab[] = [
  { label: 'All', filter: {} },
  { label: 'Action Needed', filter: { status: 'Pending', minScore: HIGH_MATCH_SCORE } },
  { label: 'Pending', filter: { status: 'Pending' } },
  { label: 'Applied', filter: { status: 'Applied' } },
  { label: 'Interviewing', filter: { status: 'Interviewing' } },
  { label: 'High Match', filter: { minScore: HIGH_MATCH_SCORE } },
  { label: 'Rejected', filter: { status: 'Rejected' } },
]
