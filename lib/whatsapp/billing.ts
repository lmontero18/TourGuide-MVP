import 'server-only'
import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GraphError } from '@/lib/whatsapp/templates'
import type { Logger } from '@/lib/logger'

// Meta rechaza con 131042 cuando la WABA no tiene metodo de pago valido.
// Somos Tech Provider: no podemos leer la tarjeta del cliente, asi que este
// error es la unica senal real de que falta (ver CODE-173).
export const PAYMENT_ERROR_CODE = 131042

export function isPaymentError(error: unknown): boolean {
  if (error instanceof GraphError) return !!error.detail?.includes(String(PAYMENT_ERROR_CODE))
  return error instanceof Error && error.message.includes(String(PAYMENT_ERROR_CODE))
}

type Target = { orgId: string } | { phoneNumberId: string }

// Marca la cuenta con el rechazo. Requiere el service client: lo llaman el
// webhook y rutas de agentes, y whatsapp_accounts solo es escribible por admin.
export async function markPaymentFailed(service: SupabaseClient, target: Target, log: Logger) {
  const query = service.from('whatsapp_accounts').update({ payment_failed_at: new Date().toISOString() })
  const { data, error } = await ('orgId' in target
    ? query.eq('org_id', target.orgId)
    : query.eq('phone_number_id', target.phoneNumberId)
  ).select('org_id').maybeSingle()

  if (error) {
    log.error('failed to mark payment failure', { error })
    return
  }
  log.warn('meta rejected send: no payment method', { org_id: data?.org_id })
  Sentry.captureMessage('WhatsApp payment method missing (131042)', {
    level: 'warning',
    tags: { org_id: data?.org_id ?? 'unknown', route: 'whatsapp-billing' },
  })
}

// Un envio pagado (plantilla) que sale bien prueba que el pago ya funciona.
export async function clearPaymentFailed(service: SupabaseClient, orgId: string) {
  await service
    .from('whatsapp_accounts')
    .update({ payment_failed_at: null })
    .eq('org_id', orgId)
    .not('payment_failed_at', 'is', null)
}
