'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { DeliveryStatus } from '@/types'

export interface TemplateSend {
  id: string
  created_at: string
  template_name: string
  template_language: string | null
  template_category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION' | null
  delivery_status: DeliveryStatus | null
  delivery_error_code: number | null
  sender: { id: string; full_name: string | null; email: string } | null
  conversation: { id: string; contact: { name: string | null; phone: string } | null } | null
}

// "YYYY-MM" → limites del mes en hora local del navegador.
function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { from: new Date(y, m - 1, 1).toISOString(), to: new Date(y, m, 1).toISOString() }
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Plantillas enviadas en un mes, con quien las mando y como terminaron.
// RLS de messages limita a las conversaciones de la propia org.
export function useTemplateHistory(month: string) {
  return useQuery({
    queryKey: queryKeys.templateHistory(month),
    queryFn: async () => {
      const { from, to } = monthRange(month)
      const { data, error } = await createClient()
        .from('messages')
        .select(
          'id, created_at, template_name, template_language, template_category, delivery_status, delivery_error_code, sender:users!messages_sender_id_fkey(id, full_name, email), conversation:conversations(id, contact:contacts(name, phone))'
        )
        .not('template_name', 'is', null)
        .gte('created_at', from)
        .lt('created_at', to)
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return (data ?? []) as unknown as TemplateSend[]
    },
  })
}

export interface TemplateStats {
  sent: number
  delivered: number
  read: number
  failed: number
  byAgent: { name: string; count: number }[]
  byTemplate: { name: string; count: number }[]
  byCategory: { MARKETING: number; UTILITY: number; AUTHENTICATION: number }
}

export function templateStats(rows: TemplateSend[], unknownAgent: string): TemplateStats {
  const count = (list: (string | null | undefined)[]) => {
    const map = new Map<string, number>()
    for (const k of list) map.set(k || unknownAgent, (map.get(k || unknownAgent) ?? 0) + 1)
    return [...map.entries()].map(([name, c]) => ({ name, count: c })).sort((a, b) => b.count - a.count)
  }
  const byCategory = { MARKETING: 0, UTILITY: 0, AUTHENTICATION: 0 }
  for (const r of rows) if (r.template_category) byCategory[r.template_category]++
  return {
    sent: rows.length,
    delivered: rows.filter((r) => r.delivery_status === 'delivered' || r.delivery_status === 'read').length,
    read: rows.filter((r) => r.delivery_status === 'read').length,
    failed: rows.filter((r) => r.delivery_status === 'failed').length,
    byAgent: count(rows.map((r) => r.sender?.full_name || r.sender?.email)),
    byTemplate: count(rows.map((r) => r.template_name)),
    byCategory,
  }
}
