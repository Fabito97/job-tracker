import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, toQuery } from '@/lib/api'
import { PAGE_SIZE, QUERY_KEYS } from '@/lib/constants'
import type { JobDetail, JobFilters, JobListItem, JobMetrics, Paged } from '@/types'

export function useJobs(filters: JobFilters, page: number) {
  return useQuery({
    queryKey: [QUERY_KEYS.jobs, filters, page],
    queryFn: () => api<Paged<JobListItem>>(`/api/jobs?${toQuery({ ...filters, page, pageSize: PAGE_SIZE })}`),
    placeholderData: keepPreviousData, // Keeps the grid on screen while the next page loads.
  })
}

export function useJob(id: number | null) {
  return useQuery({
    queryKey: [QUERY_KEYS.job, id],
    queryFn: () => api<JobDetail>(`/api/jobs/${id}`),
    enabled: id !== null,
  })
}

export function useMetrics() {
  return useQuery({
    queryKey: [QUERY_KEYS.metrics],
    queryFn: () => api<JobMetrics>('/api/jobs/metrics'),
  })
}

export function useBoards() {
  return useQuery({
    queryKey: [QUERY_KEYS.boards],
    queryFn: () => api<string[]>('/api/jobs/boards'),
  })
}
