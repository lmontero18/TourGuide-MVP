'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MetricsPeriod, OrgMetrics } from '@/types'

const PERIOD_DAYS: Record<MetricsPeriod, number> = { '7d': 7, '30d': 30, '90d': 90 }

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
  const [result, setResult] = useState<MetricsResult>({ period: null, data: null, error: false })

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const to = new Date()
    const from = new Date(to.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000)

    supabase
      .rpc('get_org_metrics', { p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error loading metrics:', error)
          setResult({ period, data: null, error: true })
          return
        }
        setResult({ period, data: data as unknown as OrgMetrics, error: false })
      })

    return () => {
      cancelled = true
    }
  }, [period])

  return { data: result.data, error: result.error, loading: result.period !== period }
}
