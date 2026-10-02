'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadDetails, LeadStatus } from '@/types'
import { readCache, writeCache } from '@/lib/clientCache'

export interface LeadWithContact extends Lead {
  contact: { name: string | null; phone: string } | null
}

export interface LeadPatch {
  status?: LeadStatus
  amount?: number | null
  currency?: string | null
  fields?: Partial<Record<'tour_interest' | 'summary' | 'next_step' | keyof LeadDetails, string | null>>
}

const LEAD_SELECT =
  'id, org_id, contact_id, conversation_id, tour_interest, status, metadata, summary, next_step, intent, locked_fields, amount, currency, extracted_at, closed_at, created_at, updated_at, contact:contacts(name, phone)'

// Los cerrados (reservado/perdido) se muestran hasta 60 dias; los abiertos, todos.
const CLOSED_WINDOW_DAYS = 60

async function patchLead(id: string, patch: LeadPatch): Promise<{ ok: true } | { ok: false; error: string }> {
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

// Tablero de leads de la org, en vivo: cualquier cambio (la IA llenando una
// ficha, otro agente moviendo una tarjeta) recarga la lista.
export function useLeads(orgId: string | null) {
  const [leads, setLeads] = useState<LeadWithContact[] | null>(() => (orgId ? readCache<LeadWithContact[]>(`leads:${orgId}`) ?? null : null))
  const [error, setError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trae la lista; el estado se aplica en el callback (nunca sincrono en el efecto).
  const load = useCallback(async () => {
    if (!orgId) return
    const supabase = createClient()
    const since = new Date(Date.now() - CLOSED_WINDOW_DAYS * 86_400_000).toISOString()
    return supabase
      .from('leads')
      .select(LEAD_SELECT)
      .or(`status.in.(new,contacted,qualified),closed_at.gte.${since}`)
      .order('updated_at', { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (err) return setError(true)
        setError(false)
        writeCache(`leads:${orgId}`, data ?? [])
        setLeads((data ?? []) as unknown as LeadWithContact[])
      })
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    const supabase = createClient()
    const initial = setTimeout(() => void load(), 0)
    const schedule = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void load(), 400)
    }
    const channel = supabase
      .channel(`leads:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `org_id=eq.${orgId}` }, schedule)
      .subscribe()
    return () => {
      clearTimeout(initial)
      if (timer.current) clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [orgId, load])

  const update = useCallback(
    async (id: string, patch: LeadPatch) => {
      // Optimista para que la tarjeta se mueva al instante; el realtime confirma.
      setLeads((prev) =>
        prev?.map((l) =>
          l.id === id
            ? {
                ...l,
                ...(patch.status ? { status: patch.status } : {}),
                ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
                ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
              }
            : l
        ) ?? prev
      )
      const res = await patchLead(id, patch)
      if (!res.ok) void load()
      return res
    },
    [load]
  )

  return { leads, error, update, refresh: requestRefresh, reload: load }
}

// Lead mas reciente de una conversacion (panel "Ficha" del chat), en vivo.
export function useConversationLead(conversationId: string) {
  const [lead, setLead] = useState<LeadWithContact | null | undefined>(undefined)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('leads')
      .select(LEAD_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLead((data as unknown as LeadWithContact) ?? null)
  }, [conversationId])

  useEffect(() => {
    const supabase = createClient()
    const initial = setTimeout(() => void load(), 0)
    const channel = supabase
      .channel(`lead-conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `conversation_id=eq.${conversationId}` },
        () => void load()
      )
      .subscribe()
    return () => {
      clearTimeout(initial)
      supabase.removeChannel(channel)
    }
  }, [conversationId, load])

  const update = useCallback(
    async (id: string, patch: LeadPatch) => {
      const res = await patchLead(id, patch)
      void load()
      return res
    },
    [load]
  )

  return { lead, update, refresh: requestRefresh }
}
