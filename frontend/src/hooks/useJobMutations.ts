import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import type { DirectivesUpdate, ImportResult, JobDetail, TailorResumePayload, TrackingUpdate } from '@/types'

/** Anything that changes the stored jobs invalidates the grid, the cards and the board list. */
function useRefreshJobs() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.jobs] })
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.metrics] })
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.boards] })
  }
}

export function useImportJobs() {
  const refresh = useRefreshJobs()

  return useMutation({
    mutationFn: (jobs: unknown[]) => api<ImportResult>('/api/jobs/import', { method: 'POST', body: JSON.stringify(jobs) }),
    onSuccess: refresh,
  })
}

export function useUpdateTracking() {
  const queryClient = useQueryClient()
  const refresh = useRefreshJobs()

  return useMutation({
    mutationFn: ({ id, ...tracking }: TrackingUpdate) =>
      api<JobDetail>(`/api/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify(tracking) }),
    onSuccess: (job) => {
      queryClient.setQueryData([QUERY_KEYS.job, job.id], job)
      refresh()
    },
  })
}

export function useUpdateDirectives() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...directives }: DirectivesUpdate) =>
      api<JobDetail>(`/api/jobs/${id}/directives`, { method: 'PATCH', body: JSON.stringify(directives) }),
    onSuccess: (job) => {
      queryClient.setQueryData([QUERY_KEYS.job, job.id], job)
    },
  })
}

export const useCoverLetter = () => useGenerator('cover-letter')

export function useTailoredResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (arg: number | TailorResumePayload) => {
      const id = typeof arg === 'number' ? arg : arg.id
      const payload = typeof arg === 'number' ? { regenerate: true } : { regenerate: arg.regenerate ?? true, confirmedSkills: arg.confirmedSkills, notes: arg.notes }
      return api<JobDetail>(`/api/jobs/${id}/resume`, { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: (job) => queryClient.setQueryData([QUERY_KEYS.job, job.id], job),
  })
}

/** Both generators write onto the job and answer with it, so the cached detail is simply replaced. */
function useGenerator(resource: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api<JobDetail>(`/api/jobs/${id}/${resource}`, { method: 'POST' }),
    onSuccess: (job) => queryClient.setQueryData([QUERY_KEYS.job, job.id], job),
  })
}
