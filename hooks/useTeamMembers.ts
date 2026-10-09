'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface TeamMemberOption {
  id: string
  name: string
  role: string
}

// Miembros de la agencia para asignar conversaciones (CODE-187). RLS de users
// deja leer a los de la misma org; no hace falta la API de agentes (admin).
export function useTeamMembers() {
  const { orgId } = useAuth()
  return useQuery({
    queryKey: ['team-members', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TeamMemberOption[]> => {
      const { data, error } = await createClient()
        .from('users')
        .select('id, full_name, email, role')
        .eq('org_id', orgId!)
      if (error) throw error
      return (data ?? [])
        .map((u) => ({ id: u.id, name: u.full_name?.trim() || u.email.split('@')[0], role: u.role }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}
