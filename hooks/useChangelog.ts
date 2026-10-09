'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { CHANGELOG, type ChangelogEntry } from '@/lib/changelog'

const KEY = ['changelog-seen'] as const

// Novedades visibles para el usuario (las adminOnly solo para admins) y cuales
// no vio todavia (publicadas despues de users.changelog_seen_at).
export function useChangelog() {
  const { user, role } = useAuth()
  const queryClient = useQueryClient()
  const { data: seenAt, isFetched } = useQuery({
    queryKey: KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await createClient().from('users').select('changelog_seen_at').eq('id', user!.id).single()
      if (error) throw error
      return (data.changelog_seen_at as string | null) ?? null
    },
  })

  const entries = useMemo<ChangelogEntry[]>(
    () => CHANGELOG.filter((e) => !e.adminOnly || role === 'admin'),
    [role]
  )
  const unseen = useMemo(
    () => (isFetched ? entries.filter((e) => !seenAt || new Date(e.date) > new Date(seenAt)) : []),
    [entries, seenAt, isFetched]
  )

  async function markSeen() {
    if (!user || !unseen.length) return
    const now = new Date().toISOString()
    queryClient.setQueryData(KEY, now)
    const { error } = await createClient().from('users').update({ changelog_seen_at: now }).eq('id', user.id)
    if (error) void queryClient.invalidateQueries({ queryKey: KEY })
  }

  return { entries, unseen, markSeen }
}
