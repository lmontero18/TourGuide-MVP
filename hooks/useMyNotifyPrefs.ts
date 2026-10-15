'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { NotifyScope } from '@/types'

const DEFAULTS = { scope: 'all' as NotifyScope, sound: true }

// Avisos que el admin le configuro a este usuario (CODE-195). Si la consulta
// falla se usan los valores de siempre: nunca dejar a alguien sin avisos.
export function useMyNotifyPrefs() {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: ['my-notify-prefs', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('users')
        .select('notify_scope, notify_sound')
        .eq('id', user!.id)
        .single()
      if (error || !data) return DEFAULTS
      return { scope: data.notify_scope as NotifyScope, sound: data.notify_sound }
    },
  })
  return data ?? DEFAULTS
}
