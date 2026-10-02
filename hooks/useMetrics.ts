'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { MetricsPeriod, OrgMetrics } from '@/types'

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const

async function fetchMetrics(period: MetricsPeriod): Promise<OrgMetrics> {
  const supabase = createClient()
  const to = new Date()
  const days = PERIOD_DAYS[period as keyof typeof PERIOD_DAYS] ?? 7
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  // Mes calendario: los limites los calcula Postgres en la zona de la agencia.
  const { data, error } = period.startsWith('month:')
    ? await supabase.rpc('get_org_metrics_month', { p_month: `${period.slice(6)}-01` })
    : await supabase.rpc('get_org_metrics', { p_from: from.toISOString(), p_to: to.toISOString() })
  if (error) throw error
  return data as unknown as OrgMetrics
}

// La agregacion vive en Postgres (RPC get_org_metrics): la org sale de
// get_user_org_id() del lado de la DB, no se pasa desde el cliente.
export function useMetrics(period: MetricsPeriod) {
  // Al cambiar de periodo se mantiene el anterior (sin parpadear a vacio)
  // mientras llega el nuevo: loading = se esta mostrando el anterior.
  const { data, isError, isPending, isPlaceholderData } = useQuery({
    queryKey: queryKeys.metrics(period),
    queryFn: () => fetchMetrics(period),
    placeholderData: keepPreviousData,
  })
  return { data: data ?? null, error: isError, loading: isPending || isPlaceholderData }
}
