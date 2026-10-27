'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { periodRange } from '@/lib/metrics/periodRange'
import type { MetricsPeriod, TeamMetrics } from '@/types'

// Metricas por agente (RPC get_team_metrics). Solo admin y owner: la DB
// rechaza a un agente.
export function useTeamMetrics(period: MetricsPeriod, enabled: boolean) {
  const { data, isError, isPending, isPlaceholderData } = useQuery({
    queryKey: queryKeys.teamMetrics(period),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { from, to } = periodRange(period)
      const { data, error } = await createClient().rpc('get_team_metrics', { p_from: from.toISOString(), p_to: to.toISOString() })
      if (error) throw error
      return data as unknown as TeamMetrics
    },
  })
  return { data: data ?? null, error: isError, loading: isPending || isPlaceholderData }
}
