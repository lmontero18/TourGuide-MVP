import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from '@/lib/logger'

export interface WebhookStatus {
  id?: string
  status?: string
  errors?: { code?: number }[]
}

type Delivery = 'sent' | 'delivered' | 'read' | 'failed'
const RANK: Record<Delivery, number> = { sent: 1, delivered: 2, read: 3, failed: 0 }

// Aplica un status del webhook de Meta al mensaje que enviamos (por wamid).
// Los status pueden llegar desordenados: nunca se baja de leido a entregado.
// "failed" gana salvo que despues llegue entregado/leido (Meta reintento).
export async function applyDeliveryStatus(service: SupabaseClient, status: WebhookStatus, log: Logger) {
  const next = status.status as Delivery
  if (!status.id || !(next in RANK)) return

  const { data: msg } = await service
    .from('messages')
    .select('id, delivery_status')
    .eq('wa_message_id', status.id)
    .maybeSingle()
  if (!msg) return

  const current = msg.delivery_status as Delivery | null
  if (next !== 'failed' && current && current !== 'failed' && RANK[next] <= RANK[current]) return
  if (next === current) return

  const { error } = await service
    .from('messages')
    .update({
      delivery_status: next,
      delivery_error_code: next === 'failed' ? (status.errors?.[0]?.code ?? null) : null,
      delivery_updated_at: new Date().toISOString(),
    })
    .eq('id', msg.id)
  if (error) log.warn('delivery status update failed', { error, wamid: status.id })
}
