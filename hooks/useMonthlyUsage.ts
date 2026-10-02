'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MonthlyUsage, MonthlyUsagePoint } from '@/types'
import { readCache, writeCache } from '@/lib/clientCache'

// Mes calendario completo, independiente del selector de periodo de /metrics.
export function useMonthlyUsage() {
  const [usage, setUsage] = useState<MonthlyUsage | null>(() => readCache<MonthlyUsage>('usage') ?? null)
  const [history, setHistory] = useState<MonthlyUsagePoint[] | null>(() => readCache<MonthlyUsagePoint[]>('usage-history') ?? null)

  useEffect(() => {
    let cancelled = false
    // Historial de 6 meses, para cruzar con la factura de Meta.
    createClient()
      .rpc('get_org_monthly_usage_history', { p_months: 6 })
      .then(({ data, error }) => {
        if (error) return
        writeCache('usage-history', data)
        if (!cancelled) setHistory(data as unknown as MonthlyUsagePoint[])
      })
    createClient()
      .rpc('get_org_monthly_usage')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error loading monthly usage:', error)
          return
        }
        writeCache('usage', data)
        setUsage(data as unknown as MonthlyUsage)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { usage, history }
}
