'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { periodRange } from '@/lib/metrics/periodRange'
import type { BusinessMetrics, MetricsPeriod } from '@/types'

// Vista Negocio (RPC get_business_metrics). Solo admin y owner: la DB rechaza
// a un agente.
export function useBusinessMetrics(period: MetricsPeriod, enabled: boolean) {
  const { data, isError, isPending, isPlaceholderData } = useQuery({
    queryKey: queryKeys.businessMetrics(period),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { from, to } = periodRange(period)
      const { data, error } = await createClient().rpc('get_business_metrics', { p_from: from.toISOString(), p_to: to.toISOString() })
      if (error) throw error
      return data as unknown as BusinessMetrics
    },
  })
  return { data: data ?? null, error: isError, loading: isPending || isPlaceholderData }
}
