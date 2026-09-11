import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import type { ImportResult, JobDetail, TrackingUpdate } from '@/types'

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

export const useCoverLetter = () => useGenerator('cover-letter')

export const useTailoredResume = () => useGenerator('resume')

/** Both generators write onto the job and answer with it, so the cached detail is simply replaced. */
function useGenerator(resource: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api<JobDetail>(`/api/jobs/${id}/${resource}`, { method: 'POST' }),
    onSuccess: (job) => queryClient.setQueryData([QUERY_KEYS.job, job.id], job),
  })
}
