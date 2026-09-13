export const JOB_STATUSES = ['Pending', 'Applied', 'Interviewing', 'Offer', 'Rejected'] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export interface JobListItem {
  id: number
  jobTitle: string
  company: string
  location: string
  jobBoard: string
  jobUrl: string
  matchScore: number
  resumeVersion: string
  status: JobStatus
  postedDate: string
  appliedAt: string | null
  interviewAt: string | null
}

export interface JobAnalysis {
  reason: string
  tailoredSummary: string
  sponsorshipNote: string
  locationEligibility?: string
  locationNote?: string
  matchingStrengths: string[]
  missingKeywords: string[]
}

export interface TailoredRole {
  company: string
  title: string
  bullets: string[]
}

export interface TailoredResume {
  coreCompetencies: string[]
  technicalSkills: string[]
  experience: TailoredRole[]
}

export interface JobDetail extends JobListItem {
  description: string
  createdAt: string
  analysis: JobAnalysis
  coverLetter: string | null
  tailored: TailoredResume | null
  confirmedSkills?: string[]
  tailoringNotes?: string | null
}

/** The whole tracking state is sent on every save, so a cleared date is cleared on the server too. */
export interface TrackingUpdate {
  id: number
  status: JobStatus
  appliedOn: string | null
  interviewOn: string | null
}

export interface DirectivesUpdate {
  id: number
  confirmedSkills?: string[]
  tailoringNotes?: string | null
}

export interface TailorResumePayload {
  id: number
  regenerate?: boolean
  confirmedSkills?: string[]
  notes?: string | null
  mode?: 'refine' | 'fresh'
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface JobMetrics {
  total: number
  pending: number
  applied: number
  interviewing: number
  highMatch: number
  actionNeeded: number
  averageScore: number
}

export interface ImportResult {
  total: number
  saved: number
  duplicates: number
  blacklisted: number
  rejected: number
  failed: number
}

/** One entry of a scraped jobs file, which is the same shape the importer accepts. */
export interface ScrapedJob {
  jobTitle: string
  company: string
  location?: string
  date?: string
  jobUrl: string
  jobDescription?: string
}

/** Anything left out falls back to the board's configured search. */
export interface ScrapeRequest {
  board: string
  keywords?: string
  maxJobs?: number
  companies?: string[]
  location?: string
  remoteOnly?: boolean
  datePosted?: string
  experienceLevel?: string
  excludeKeywords?: string
}

/** What one board's configuration falls back to, used to prefill the scrape form. */
export interface ScrapeDefaults {
  board: string
  keywords: string
  location: string
  maxJobs: number
  companies: string[]
  /** An ATS lists one employer at a time, so it takes company tokens and keywords only filter. */
  searchesByCompany: boolean
  remoteOnly?: boolean
  datePosted?: string
  experienceLevel?: string
  excludeKeywords?: string
}

/** A scraped posting plus what the importer would already do with it. */
export interface ScrapedJobRow {
  job: ScrapedJob
  isDuplicate: boolean
  isBlacklisted: boolean
}

export interface ScrapeResult {
  file: string
  count: number
  jobs: ScrapedJobRow[]
}

/** Everything the grid can be narrowed by. Tabs are presets that write into this shape. */
export interface JobFilters {
  company?: string
  status?: JobStatus
  minScore?: number
  board?: string
  from?: string
  to?: string
}

export interface ProviderStatus {
  model: string
  maskedApiKey: string
  hasApiKey: boolean
  baseUrl: string | null
}

export interface AiSettings {
  provider: string
  model: string
  maskedApiKey: string
  hasApiKey: boolean
  baseUrl: string | null
  providers?: Record<string, ProviderStatus>
}

export interface CriteriaSettings {
  minScore: number
  requiresSponsorship: boolean
  requireClearanceCheck: boolean
  targetLocation: string | null
  keepRejectedJobs: boolean
  professionalHeadline?: string | null
  targetSeniority?: string | null
  currentLocation?: string | null
  targetLocations?: string[] | null
  openToRelocation?: boolean | null
  workAuthorization?: string | null
  hasSecurityClearance?: boolean | null
  customDealbreakers?: string[] | null
}

export interface BlacklistSettings {
  enabled: boolean
  companies: string[]
}

export interface AppSettings {
  ai: AiSettings
  criteria: CriteriaSettings
  blacklist: BlacklistSettings
  availableProviders: string[]
}

export interface UpdateSettingsRequest {
  ai?: {
    provider?: string
    model?: string
    apiKey?: string
    baseUrl?: string | null
  }
  criteria?: {
    minScore?: number
    requiresSponsorship?: boolean
    requireClearanceCheck?: boolean
    targetLocation?: string | null
    keepRejectedJobs?: boolean
    professionalHeadline?: string | null
    targetSeniority?: string | null
    currentLocation?: string | null
    targetLocations?: string[] | null
    openToRelocation?: boolean | null
    workAuthorization?: string | null
    hasSecurityClearance?: boolean | null
    customDealbreakers?: string[] | null
  }
  blacklist?: {
    enabled?: boolean
    companies?: string[]
  }
}

export interface ResumeItem {
  id: number
  role: string
  fileName: string
  isDefault: boolean
  createdAt: string
  preview: string
}
