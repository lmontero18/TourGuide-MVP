'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ASSIGNED_AGENT_EMBED, toAssignee } from '@/lib/assignee'
import type { Assignee, ConversationStatus } from '@/types'

interface ControlState {
  botActive: boolean
  assignee: Assignee | null
  status: ConversationStatus
}

// Estado en vivo de quien atiende la conversacion (bot o agente) y de su
// ciclo de vida (open / pending / resolved). Se suscribe a
// los UPDATE de la fila: si otro agente toma o devuelve el control, el banner y
// el boton de esta pantalla cambian sin recargar.
export function useConversationControl(conversationId: string, initial: ControlState) {
  const [state, setState] = useState<ControlState>(initial)

  const refresh = useCallback(async () => {
    const { data } = await createClient()
      .from('conversations')
      .select(`bot_active, status, ${ASSIGNED_AGENT_EMBED}`)
      .eq('id', conversationId)
      .single()
    if (!data) return
    const row = data as unknown as {
      bot_active: boolean
      status: ConversationStatus
      assigned_agent: { id: string; full_name: string | null; email: string } | null
    }
    setState({ botActive: row.bot_active, status: row.status, assignee: toAssignee(row.assigned_agent) })
  }, [conversationId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`conversation-control:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
        () => { refresh() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, refresh])

  return { ...state, setState, refresh }
}
