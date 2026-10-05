import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// Frenos de abuso por contacto. Un troll o un bucle contra otro bot (el
// contestador automatico de otro negocio) no son clientes reales: en vez de
// cortar, la conversacion pasa a un agente. Un viajero real no llega a estos
// numeros porque el buffer junta sus mensajes seguidos.
// Ver doc "Tourfy: costos de IA y márgenes" (bucle = $700–2.000/mes).
export const LIMITS = {
  botRepliesPerHour: 30,
  botRepliesPerDay: 150,
  // Mismo texto repetido por el cliente en poco tiempo = auto-respuesta.
  repeatWindowMin: 15,
  repeatCount: 4,
  // Muchos mensajes del cliente en pocos minutos = flood.
  floodWindowMin: 10,
  floodCount: 40,
} as const

export type AbuseReason = 'hourly_limit' | 'daily_limit' | 'repetition' | 'flood'

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

async function countMessages(service: SupabaseClient, conversationId: string, role: string, sinceMin: number) {
  const { count } = await service
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('role', role)
    .gte('created_at', ago(sinceMin))
  return count ?? 0
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

// null = todo normal. Corre antes de cada llamada al bot.
export async function detectAbuse(service: SupabaseClient, conversationId: string): Promise<AbuseReason | null> {
  const [hour, day, flood, recent] = await Promise.all([
    countMessages(service, conversationId, 'assistant', 60),
    countMessages(service, conversationId, 'assistant', 24 * 60),
    countMessages(service, conversationId, 'user', LIMITS.floodWindowMin),
    service
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .gte('created_at', ago(LIMITS.repeatWindowMin))
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (hour >= LIMITS.botRepliesPerHour) return 'hourly_limit'
  if (day >= LIMITS.botRepliesPerDay) return 'daily_limit'
  if (flood >= LIMITS.floodCount) return 'flood'

  const counts = new Map<string, number>()
  for (const m of (recent.data ?? []) as { content: string }[]) {
    const key = normalize(m.content)
    if (key.length < 2) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  if ([...counts.values()].some((c) => c >= LIMITS.repeatCount)) return 'repetition'
  return null
}
