'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Conversation } from '@/types'

export function useConversations(orgId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Initial load
    supabase
      .from('conversations')
      .select('id, org_id, contact_id, status, bot_active, assigned_agent_id, last_message_at, created_at, updated_at')
      .eq('org_id', orgId)
      .order('last_message_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Error loading conversations:', error)
        if (data) setConversations(data as Conversation[])
        setLoading(false)
      })

    // Realtime subscription
    const channel = supabase
      .channel(`conversations:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as Conversation, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === (payload.new as Conversation).id ? (payload.new as Conversation) : c
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, supabase])

  return { conversations, loading }
}
