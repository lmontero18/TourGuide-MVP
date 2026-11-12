'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ASSIGNED_AGENT_EMBED } from '@/lib/assignee'
import { queryKeys } from '@/lib/query/keys'
import type { ContactKind, ConversationStatus } from '@/types'

export interface ConversationDetail {
  id: string
  bot_active: boolean
  status: ConversationStatus
  contact: { name: string | null; phone: string; channel: string; kind: ContactKind } | null
  assigned_agent: { id: string; full_name: string | null; email: string } | null
}

// Cabecera del chat. El estado del bot y la asignacion los mantiene al dia
// useConversationControl (realtime); esto es solo la carga inicial.
export function useConversationDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('conversations')
        .select(`id, bot_active, status, contact:contacts(name, phone, channel, kind), ${ASSIGNED_AGENT_EMBED}`)
        .eq('id', id)
        .is('deleted_at', null)
        .single()
      if (error) throw error
      return data as unknown as ConversationDetail
    },
  })
}
