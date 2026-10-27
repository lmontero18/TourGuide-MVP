'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { MetricsPeriod, TeamMetrics } from '@/types'

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const

// Mismos periodos que Metricas. El mes calendario se corta en la hora local de
// quien mira (get_org_metrics_month lo hace en la zona de la agencia; para la
// tabla del equipo la diferencia de unas horas no cambia la foto).
function range(period: MetricsPeriod): { from: Date; to: Date } {
  if (period.startsWith('month:')) {
    const [y, m] = period.slice(6).split('-').map(Number)
    return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) }
  }
  const to = new Date()
  const days = PERIOD_DAYS[period as keyof typeof PERIOD_DAYS] ?? 7
  return { from: new Date(to.getTime() - days * 86_400_000), to }
}

// Metricas por agente (RPC get_team_metrics). Solo admin y owner: la DB
// rechaza a un agente.
export function useTeamMetrics(period: MetricsPeriod, enabled: boolean) {
  const { data, isError, isPending, isPlaceholderData } = useQuery({
    queryKey: queryKeys.teamMetrics(period),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { from, to } = range(period)
      const { data, error } = await createClient().rpc('get_team_metrics', { p_from: from.toISOString(), p_to: to.toISOString() })
      if (error) throw error
      return data as unknown as TeamMetrics
    },
  })
  return { data: data ?? null, error: isError, loading: isPending || isPlaceholderData }
}
