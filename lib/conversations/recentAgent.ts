import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { orgHasFeature } from '@/lib/features'

// Cuanto dura "la atendio una persona hace poco". Mas largo y una consulta
// nueva de otro dia tambien le cae a la misma persona en vez de al bot.
export const STICKY_HOURS = 24

// Quien del equipo le escribio al cliente en las ultimas STICKY_HOURS, si
// sigue en la org como admin o agente. Al reabrirse una conversacion resuelta
// (flag stickyAgent) vuelve a esa persona y no al bot: el bot no tiene el
// contexto de lo que hablo el equipo y contesta un "gracias" o un 🙂 con
// preguntas de venta.
export async function recentAgent(service: SupabaseClient, conversationId: string, orgId: string): Promise<string | null> {
  if (!(await orgHasFeature(service, orgId, 'stickyAgent'))) return null

  const since = new Date(Date.now() - STICKY_HOURS * 3_600_000).toISOString()
  const { data: last } = await service
    .from('messages')
    .select('sender_id')
    .eq('conversation_id', conversationId)
    .eq('role', 'agent')
    .not('sender_id', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!last?.sender_id) return null

  const { data: member } = await service
    .from('users')
    .select('id')
    .eq('id', last.sender_id)
    .eq('org_id', orgId)
    .in('role', ['admin', 'agent'])
    .maybeSingle()
  return member?.id ?? null
}
