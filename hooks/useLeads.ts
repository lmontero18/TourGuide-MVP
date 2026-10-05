'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { Lead, LeadDetails, LeadStatus } from '@/types'

export interface LeadWithContact extends Lead {
  contact: { name: string | null; phone: string } | null
}

export interface LeadPatch {
  status?: LeadStatus
  amount?: number | null
  currency?: string | null
  fields?: Partial<Record<'tour_interest' | 'summary' | 'next_step' | keyof LeadDetails, string | null>>
}

type PatchResult = { ok: true } | { ok: false; error: string }

const LEAD_SELECT =
  'id, org_id, contact_id, conversation_id, tour_interest, status, metadata, summary, next_step, intent, locked_fields, amount, currency, extracted_at, closed_at, created_at, updated_at, contact:contacts(name, phone)'

// Los cerrados (reservado/perdido) se muestran hasta 60 dias; los abiertos, todos.
const CLOSED_WINDOW_DAYS = 60

async function patchLead(id: string, patch: LeadPatch): Promise<PatchResult> {
  const res = await fetch(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({}))
  return { ok: false, error: body.error ?? '' }
}

async function requestRefresh(id: string): Promise<boolean> {
  const res = await fetch(`/api/leads/${id}/refresh`, { method: 'POST' })
  return res.ok
}

function applyPatch(lead: LeadWithContact, patch: LeadPatch): LeadWithContact {
  return {
    ...lead,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
  }
}

// Tablero de leads de la org, en vivo: cualquier cambio (la IA llenando una
// ficha, otro agente moviendo una tarjeta) invalida la consulta.
export function useLeads(orgId: string | null) {
  const queryClient = useQueryClient()
  const key = useMemo(() => queryKeys.leads(orgId), [orgId])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isError } = useQuery({
    queryKey: key,
    enabled: !!orgId,
    queryFn: async () => {
      const since = new Date(Date.now() - CLOSED_WINDOW_DAYS * 86_400_000).toISOString()
      const { data, error } = await createClient()
        .from('leads')
        .select(LEAD_SELECT)
        .or(`status.in.(new,contacted,qualified),closed_at.gte.${since}`)
        .order('updated_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as unknown as LeadWithContact[]
    },
  })

  useEffect(() => {
    if (!orgId) return
    const supabase = createClient()
    // Rafagas (la IA actualiza varias fichas seguidas) = una sola recarga.
    const schedule = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void queryClient.invalidateQueries({ queryKey: ['leads'] }), 400)
    }
    const channel = supabase
      .channel(`leads:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `org_id=eq.${orgId}` }, schedule)
      .subscribe()
    return () => {
      if (timer.current) clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [orgId, queryClient])

  const update = useCallback(
    async (id: string, patch: LeadPatch) => {
      // Optimista: la tarjeta se mueve al instante; si falla, se recarga.
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<LeadWithContact[]>(key, (prev) => prev?.map((l) => (l.id === id ? applyPatch(l, patch) : l)))
      const res = await patchLead(id, patch)
      if (!res.ok) void queryClient.invalidateQueries({ queryKey: key })
      return res
    },
    [queryClient, key]
  )

  return { leads: data ?? null, error: isError, update, refresh: requestRefresh }
}

// Lead mas reciente de una conversacion (panel "Ficha" del chat), en vivo.
export function useConversationLead(conversationId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.conversationLead(conversationId)

  const { data, isPending } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('leads')
        .select(LEAD_SELECT)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as LeadWithContact) ?? null
    },
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`lead-conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `conversation_id=eq.${conversationId}` },
        () => void queryClient.invalidateQueries({ queryKey: queryKeys.conversationLead(conversationId) })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])

  const update = useCallback(
    async (id: string, patch: LeadPatch) => {
      const res = await patchLead(id, patch)
      // La ficha del chat y el tablero comparten datos: refrescar ambos.
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
      return res
    },
    [queryClient]
  )

  return { lead: isPending ? undefined : (data ?? null), update, refresh: requestRefresh }
}

export interface PastLead {
  id: string
  status: LeadStatus
  tour_interest: string | null
  amount: number | null
  currency: string | null
  created_at: string
  closed_at: string | null
}

// Oportunidades del mismo cliente (para ver en la ficha si ya compro antes).
export function useContactLeads(contactId: string | null) {
  return useQuery({
    queryKey: queryKeys.contactLeads(contactId ?? ''),
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('leads')
        .select('id, status, tour_interest, amount, currency, created_at, closed_at')
        .eq('contact_id', contactId as string)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as PastLead[]
    },
  })
}
