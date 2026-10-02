'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MetricsPeriod, OrgMetrics } from '@/types'
import { readCache, writeCache } from '@/lib/clientCache'

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const

interface MetricsResult {
  period: MetricsPeriod | null
  data: OrgMetrics | null
  error: boolean
}

// La agregacion vive en Postgres (RPC get_org_metrics): la org sale de
// get_user_org_id() del lado de la DB, no se pasa desde el cliente.
export function useMetrics(period: MetricsPeriod) {
  // loading se deriva: el resultado guardado es de otro periodo mientras llega
  // el nuevo. Se conserva `data` anterior para no parpadear a vacio.
  const [result, setResult] = useState<MetricsResult>(() => {
    const cached = readCache<OrgMetrics>(`metrics:${period}`)
    return cached ? { period, data: cached, error: false } : { period: null, data: null, error: false }
  })

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const to = new Date()
    const days = PERIOD_DAYS[period as keyof typeof PERIOD_DAYS] ?? 7
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)

    // Mes calendario: los limites los calcula Postgres en la zona de la agencia.
    const request = period.startsWith('month:')
      ? supabase.rpc('get_org_metrics_month', { p_month: `${period.slice(6)}-01` })
      : supabase.rpc('get_org_metrics', { p_from: from.toISOString(), p_to: to.toISOString() })
    request
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error loading metrics:', error)
          setResult({ period, data: null, error: true })
          return
        }
        writeCache(`metrics:${period}`, data)
        setResult({ period, data: data as unknown as OrgMetrics, error: false })
      })

    return () => {
      cancelled = true
    }
  }, [period])

  return { data: result.data, error: result.error, loading: result.period !== period }
}
