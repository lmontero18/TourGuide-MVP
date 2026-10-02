'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types'
import { readCache, writeCache } from '@/lib/clientCache'

export function useMessages(conversationId: string) {
  // Volver a una conversacion ya abierta muestra sus mensajes al instante.
  const [messages, setMessages] = useState<Message[]>(() => readCache<Message[]>(`messages:${conversationId}`) ?? [])
  const [loading, setLoading] = useState(() => !readCache<Message[]>(`messages:${conversationId}`))
  const supabase = createClient()

  useEffect(() => {
    // Initial load
    supabase
      .from('messages')
      .select('id, conversation_id, role, content, from_bot, channel, media_url, media_type, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Error loading messages:', error)
        if (data) setMessages(data as Message[])
        setLoading(false)
      })

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  useEffect(() => {
    if (!loading) writeCache(`messages:${conversationId}`, messages)
  }, [conversationId, messages, loading])

  return { messages, loading }
}
