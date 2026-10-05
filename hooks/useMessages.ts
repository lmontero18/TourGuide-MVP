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
        .select('id, conversation_id, role, content, from_bot, channel, media_url, media_type, created_at, delivery_status, delivery_error_code, sender_id, template_name, sender:users!messages_sender_id_fkey(full_name, email)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as Message[]
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
          // Realtime no trae el join del remitente: si lo escribio un agente,
          // se recarga para mostrar su nombre en la burbuja.
          if (msg.sender_id) void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) })
        }
      )
      // Estado de entrega (enviado → entregado → leido, o fallido) que marca
      // el webhook de Meta sobre un mensaje ya mostrado.
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
            prev?.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
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
