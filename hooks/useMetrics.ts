'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LeadStatus } from '@/types'

interface LeadStats {
  total: number
  byStatus: Record<LeadStatus, number>
  loading: boolean
}

export function useMetrics(orgId: string, from: Date, to: Date) {
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    byStatus: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
    loading: true,
  })
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('leads')
      .select('status, metadata, created_at')
      .eq('org_id', orgId)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading metrics:', error)
          setStats((prev) => ({ ...prev, loading: false }))
          return
        }

        const byStatus: Record<LeadStatus, number> = {
          new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0,
        }

        for (const lead of data ?? []) {
          const status = lead.status as LeadStatus
          if (status in byStatus) byStatus[status]++
        }

        setStats({
          total: data?.length ?? 0,
          byStatus,
          loading: false,
        })
      })
  }, [orgId, from, to, supabase])

  return stats
}
