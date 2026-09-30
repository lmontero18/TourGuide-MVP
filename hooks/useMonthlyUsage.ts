'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MonthlyUsage } from '@/types'

// Mes calendario completo, independiente del selector de periodo de /metrics.
export function useMonthlyUsage() {
  const [usage, setUsage] = useState<MonthlyUsage | null>(null)

  useEffect(() => {
    let cancelled = false
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

  return usage
}
