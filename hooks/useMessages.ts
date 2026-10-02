'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { Message } from '@/types'

// Mensajes de una conversacion: carga inicial con TanStack Query (volver a
// una conversacion ya abierta es instantaneo) + los nuevos por Realtime.
export function useMessages(conversationId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.messages(conversationId)

  const { data, isPending } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('messages')
        .select('id, conversation_id, role, content, from_bot, channel, media_url, media_type, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Message[]
    },
    // Realtime ya trae los nuevos: no refetch al volver a la pestaña.
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
            prev?.some((m) => m.id === msg.id) ? prev : [...(prev ?? []), msg]
          )
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])

  return { messages: data ?? [], loading: isPending }
}
