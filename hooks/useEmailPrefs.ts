'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const KEY = ['email-prefs'] as const

// Preferencias de correo del usuario actual (hoy: resumen diario).
export function useEmailPrefs() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await createClient().from('users').select('email_daily_summary').eq('id', user!.id).single()
      if (error) throw error
      return { dailySummary: data.email_daily_summary as boolean }
    },
  })

  async function setDailySummary(value: boolean) {
    if (!user) return false
    queryClient.setQueryData(KEY, { dailySummary: value })
    const { error } = await createClient().from('users').update({ email_daily_summary: value }).eq('id', user.id)
    if (error) void queryClient.invalidateQueries({ queryKey: KEY })
    return !error
  }

  return { dailySummary: data?.dailySummary ?? null, setDailySummary }
}
