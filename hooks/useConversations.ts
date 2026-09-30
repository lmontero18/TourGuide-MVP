'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ASSIGNED_AGENT_EMBED, toAssignee } from '@/lib/assignee'
import type { Assignee, ConversationStatus } from '@/types'

export interface ConversationListItem {
  id: string
  contactName: string | null
  contactPhone: string
  lastMessage: string
  lastMessageAt: string
  // ISO crudo para ordenar y recalcular el "hace X" al parchear en vivo.
  lastMessageIso: string | null
  status: ConversationStatus
  botActive: boolean
  assignee: Assignee | null
  // Mensajes del cliente sin leer por el usuario actual (0 en la abierta).
  unreadCount: number
}

interface ConversationRow {
  id: string
  status: ConversationStatus
  bot_active: boolean
  last_message_at: string | null
  contact: { name: string | null; phone: string } | null
  assigned_agent: { id: string; full_name: string | null; email: string } | null
  messages: { content: string }[]
}

const LIST_SELECT = `id, status, bot_active, last_message_at,
  contact:contacts(name, phone),
  ${ASSIGNED_AGENT_EMBED},
  messages(content, created_at)`

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

function toItem(c: ConversationRow): ConversationListItem {
  return {
    id: c.id,
    contactName: c.contact?.name ?? null,
    contactPhone: c.contact?.phone ?? '',
    lastMessage: c.messages?.[0]?.content ?? '',
    lastMessageAt: formatRelative(c.last_message_at),
    lastMessageIso: c.last_message_at,
    status: c.status,
    botActive: c.bot_active,
    assignee: toAssignee(c.assigned_agent),
    unreadCount: 0,
  }
}

function sortByRecent(list: ConversationListItem[]): ConversationListItem[] {
  return [...list].sort((a, b) => {
    if (!a.lastMessageIso) return 1
    if (!b.lastMessageIso) return -1
    return b.lastMessageIso.localeCompare(a.lastMessageIso)
  })
}

// Lista de conversaciones de la org con realtime. La carga completa ocurre una
// sola vez; despues cada evento parchea solo la fila afectada en memoria
// (antes cada mensaje de cualquier conversacion volvia a pedir la lista entera
// con un sub-select de mensajes por fila). Solo va a la red cuando falta un
// dato: conversacion nueva o agente recien asignado (hace falta su nombre).
export function useConversations(orgId: string | null, activeId: string | null = null) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  // No leidos por conversacion para el usuario actual (conversation_reads).
  const [unread, setUnread] = useState<Record<string, number>>({})
  // activeId leido desde los handlers de realtime sin re-suscribir el canal.
  const activeRef = useRef<string | null>(activeId)
  useEffect(() => {
    activeRef.current = activeId
  }, [activeId])
  // Espejo sincronico del estado: los handlers de realtime deciden si hace
  // falta ir a la red sin meter side effects dentro de setState.
  const listRef = useRef<ConversationListItem[]>([])

  const commit = useCallback((next: ConversationListItem[]) => {
    listRef.current = next
    setConversations(next)
  }, [])

  const upsert = useCallback(
    (item: ConversationListItem) => {
      const rest = listRef.current.filter((c) => c.id !== item.id)
      commit(sortByRecent([item, ...rest]))
    },
    [commit]
  )

  const fetchOne = useCallback(
    async (id: string) => {
      const { data } = await createClient()
        .from('conversations')
        .select(LIST_SELECT)
        .eq('id', id)
        .order('created_at', { ascending: false, foreignTable: 'messages' })
        .limit(1, { foreignTable: 'messages' })
        .maybeSingle()
      if (data) upsert(toItem(data as unknown as ConversationRow))
    },
    [upsert]
  )

  // Marca leida en la DB y limpia el contador local. Se llama al abrir una
  // conversacion y cuando llega un mensaje a la que esta abierta.
  const markRead = useCallback((id: string) => {
    createClient()
      .rpc('mark_conversation_read', { p_conversation_id: id })
      .then(({ error }) => {
        if (error) console.error('Error marking conversation read:', error)
        setUnread((prev) => (prev[id] ? { ...prev, [id]: 0 } : prev))
      })
  }, [])

  useEffect(() => {
    if (activeId) markRead(activeId)
  }, [activeId, markRead])

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    const supabase = createClient()

    supabase
      .from('conversations')
      .select(LIST_SELECT)
      .eq('org_id', orgId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, foreignTable: 'messages' })
      .limit(1, { foreignTable: 'messages' })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error loading conversations:', error)
        } else {
          commit(((data ?? []) as unknown as ConversationRow[]).map(toItem))
        }
        setLoading(false)
      })

    supabase.rpc('get_unread_counts').then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.error('Error loading unread counts:', error)
        return
      }
      const rows = (data ?? []) as { conversation_id: string; unread: number }[]
      setUnread(Object.fromEntries(rows.map((r) => [r.conversation_id, Number(r.unread)])))
    })

    const channel = supabase
      .channel(`conversations:${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        (payload) => { fetchOne((payload.new as { id: string }).id) }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as {
            id: string
            status: ConversationStatus
            bot_active: boolean
            last_message_at: string | null
            assigned_agent_id: string | null
          }
          const current = listRef.current.find((c) => c.id === row.id)
          // Agente nuevo: el payload trae el id pero no el nombre.
          if (!current || (row.assigned_agent_id ?? null) !== (current.assignee?.id ?? null)) {
            fetchOne(row.id)
            return
          }
          upsert({
            ...current,
            status: row.status,
            botActive: row.bot_active,
            lastMessageIso: row.last_message_at,
            lastMessageAt: formatRelative(row.last_message_at),
          })
        }
      )
      .on(
        'postgres_changes',
        // DELETE payload only includes primary key (no org_id), so we can't filter server-side.
        // Filter client-side by checking if the id is in our local list.
        { event: 'DELETE', schema: 'public', table: 'conversations' },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id
          if (deletedId) commit(listRef.current.filter((c) => c.id !== deletedId))
        }
      )
      .on(
        'postgres_changes',
        // messages no tiene org_id: RLS de realtime solo entrega los de la org.
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { conversation_id: string; content: string; created_at: string; role: string }
          if (msg.role === 'user') {
            if (msg.conversation_id === activeRef.current) {
              markRead(msg.conversation_id)
            } else {
              setUnread((prev) => ({ ...prev, [msg.conversation_id]: (prev[msg.conversation_id] ?? 0) + 1 }))
            }
          }
          const current = listRef.current.find((c) => c.id === msg.conversation_id)
          if (!current) {
            fetchOne(msg.conversation_id)
            return
          }
          upsert({
            ...current,
            lastMessage: msg.content,
            lastMessageIso: msg.created_at,
            lastMessageAt: formatRelative(msg.created_at),
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [orgId, commit, fetchOne, upsert, markRead])

  // La abierta siempre cuenta 0 (se marca leida al abrir, sin esperar la DB).
  const withUnread = useMemo(
    () => conversations.map((c) => ({ ...c, unreadCount: c.id === activeId ? 0 : unread[c.id] ?? 0 })),
    [conversations, unread, activeId]
  )
  const unreadTotal = useMemo(() => withUnread.reduce((sum, c) => sum + c.unreadCount, 0), [withUnread])

  // Sin org (usuario sin onboarding) no hay nada que cargar.
  if (!orgId) return { conversations: [] as ConversationListItem[], loading: false, unreadTotal: 0 }
  return { conversations: withUnread, loading, unreadTotal }
}
