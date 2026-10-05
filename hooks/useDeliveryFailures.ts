'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DeliveryFailure {
  messageId: string
  conversationId: string
  content: string
  errorCode: number | null
}

// Avisa cuando Meta marca como fallido un mensaje que enviamos (plantilla o
// respuesta de agente). Sin filtro de org: RLS de messages ya limita el
// realtime a las conversaciones de la propia org.
export function useDeliveryFailures(orgId: string | null, onFailure: (f: DeliveryFailure) => void) {
  const handler = useRef(onFailure)
  useEffect(() => {
    handler.current = onFailure
  })

  useEffect(() => {
    if (!orgId) return
    const supabase = createClient()
    const seen = new Set<string>()
    const channel = supabase
      .channel(`delivery-failures:${orgId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as {
          id: string
          conversation_id: string
          content: string
          delivery_status: string | null
          delivery_error_code: number | null
        }
        if (row.delivery_status !== 'failed' || seen.has(row.id)) return
        seen.add(row.id)
        handler.current({
          messageId: row.id,
          conversationId: row.conversation_id,
          content: row.content,
          errorCode: row.delivery_error_code,
        })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId])
}
