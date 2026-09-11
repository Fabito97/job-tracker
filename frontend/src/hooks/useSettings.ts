import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import type { AppSettings, UpdateSettingsRequest } from '@/types'

export function useSettings() {
  return useQuery({
    queryKey: [QUERY_KEYS.settings],
    queryFn: () => api<AppSettings>('/api/settings'),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: UpdateSettingsRequest) =>
      api<AppSettings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(req),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData([QUERY_KEYS.settings], updated)
    },
  })
}

