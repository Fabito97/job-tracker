import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import type { ScrapeDefaults, ScrapeRequest, ScrapeResult } from '@/types'

/** A run only writes a file on the server, so nothing cached changes until the jobs are imported. */
export function useScrapeBoard() {
  return useMutation({
    mutationFn: ({ board, ...request }: ScrapeRequest) =>
      api<ScrapeResult>(`/api/scrape/${board}`, { method: 'POST', body: JSON.stringify(request) }),
  })
}

/** Also the list of boards to offer, so adding one server side needs no change here. */
export function useScrapeDefaults() {
  return useQuery({
    queryKey: [QUERY_KEYS.scrapeDefaults],
    queryFn: () => api<ScrapeDefaults[]>('/api/scrape/defaults'),
    staleTime: Infinity,
  })
}
