'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Resetea unread_count mientras el agente tiene la conversación abierta.
 * Depende de messageCount para re-ejecutarse cuando entra un mensaje nuevo
 * con el chat en pantalla (el trigger de DB lo incrementó un instante antes).
 */
export function useMarkConversationRead(conversationId: string, messageCount: number) {
  useEffect(() => {
    if (!conversationId || messageCount === 0) return
    const supabase = createClient()
    supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId)
      .gt('unread_count', 0)
      .then(({ error }) => {
        if (error) console.error('Failed to mark conversation as read:', error)
      })
  }, [conversationId, messageCount])
}
