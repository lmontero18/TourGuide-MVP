'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConversationStatus } from '@/types'

export interface ConversationListItem {
  id: string
  contactName: string | null
  contactPhone: string
  lastMessage: string
  lastMessageAt: string
  status: ConversationStatus
  botActive: boolean
  unreadCount: number
}

interface ConversationRow {
  id: string
  status: ConversationStatus
  bot_active: boolean
  last_message_at: string | null
  unread_count: number
  contact: { name: string | null; phone: string } | null
  messages: { content: string }[]
}

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

export function useConversations(orgId: string | null) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!orgId) {
      setConversations([])
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `id, status, bot_active, last_message_at, unread_count,
         contact:contacts(name, phone),
         messages(content, created_at)`
      )
      .eq('org_id', orgId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, foreignTable: 'messages' })
      .limit(1, { foreignTable: 'messages' })

    if (error) {
      console.error('Error loading conversations:', error)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as ConversationRow[]
    setConversations(
      rows.map((c) => ({
        id: c.id,
        contactName: c.contact?.name ?? null,
        contactPhone: c.contact?.phone ?? '',
        lastMessage: c.messages?.[0]?.content ?? '',
        lastMessageAt: formatRelative(c.last_message_at),
        status: c.status,
        botActive: c.bot_active,
        unreadCount: c.unread_count,
      }))
    )
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    fetchAll()

    if (!orgId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`conversations:${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        () => { fetchAll() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        () => { fetchAll() }
      )
      .on(
        'postgres_changes',
        // DELETE payload only includes primary key (no org_id), so we can't filter server-side.
        // Filter client-side by checking if the id is in our local list.
        { event: 'DELETE', schema: 'public', table: 'conversations' },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id
          if (deletedId) {
            setConversations((prev) => prev.filter((c) => c.id !== deletedId))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => { fetchAll() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, fetchAll])

  return { conversations, loading }
}
