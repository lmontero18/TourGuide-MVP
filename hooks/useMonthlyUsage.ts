'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { MonthlyUsage, MonthlyUsagePoint } from '@/types'

// Mes calendario completo, independiente del selector de periodo de /metrics.
export function useMonthlyUsage() {
  const usage = useQuery({
    queryKey: queryKeys.usage,
    queryFn: async () => {
      const { data, error } = await createClient().rpc('get_org_monthly_usage')
      if (error) throw error
      return data as unknown as MonthlyUsage
    },
  })
  // Historial de 6 meses, para cruzar con la factura de Meta.
  const history = useQuery({
    queryKey: queryKeys.usageHistory,
    queryFn: async () => {
      const { data, error } = await createClient().rpc('get_org_monthly_usage_history', { p_months: 6 })
      if (error) throw error
      return data as unknown as MonthlyUsagePoint[]
    },
  })
  return { usage: usage.data ?? null, history: history.data ?? null }
}
