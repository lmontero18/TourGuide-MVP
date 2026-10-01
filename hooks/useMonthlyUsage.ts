'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MonthlyUsage, MonthlyUsagePoint } from '@/types'

// Mes calendario completo, independiente del selector de periodo de /metrics.
export function useMonthlyUsage() {
  const [usage, setUsage] = useState<MonthlyUsage | null>(null)
  const [history, setHistory] = useState<MonthlyUsagePoint[] | null>(null)

  useEffect(() => {
    let cancelled = false
    // Historial de 6 meses, para cruzar con la factura de Meta.
    createClient()
      .rpc('get_org_monthly_usage_history', { p_months: 6 })
      .then(({ data, error }) => {
        if (!cancelled && !error) setHistory(data as unknown as MonthlyUsagePoint[])
      })
    createClient()
      .rpc('get_org_monthly_usage')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error loading monthly usage:', error)
          return
        }
        setUsage(data as unknown as MonthlyUsage)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { usage, history }
}
