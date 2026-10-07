import 'server-only'
import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GraphError } from '@/lib/whatsapp/templates'
import type { Logger } from '@/lib/logger'
import { appUrl, orgRecipients, sendOnce } from '@/lib/email/notify'
import { layout, p } from '@/lib/email/layout'

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

  // Correo a los administradores: como mucho uno por dia.
  if (data?.org_id) {
    const day = new Date().toISOString().slice(0, 10)
    await sendOnce(
      service,
      {
        orgId: data.org_id,
        kind: 'payment_failed',
        dedupeKey: `payment:${data.org_id}:${day}`,
        to: await orgRecipients(service, data.org_id, { adminsOnly: true }),
        subject: 'Tus plantillas no se están entregando: falta método de pago en Meta',
        html: layout({
          title: 'Meta no está entregando tus plantillas',
          body:
            p('Las plantillas de WhatsApp se cobran y tu cuenta no tiene un método de pago válido en Meta. Los mensajes normales del bot siguen funcionando.') +
            p('Agrega una tarjeta en Meta y vuelve a enviar la plantilla. En Configuración → WhatsApp están los pasos.'),
          cta: { label: 'Agregar método de pago', url: `${appUrl()}/settings/whatsapp#billing` },
        }),
      },
      log
    ).catch(() => false)
  }
}

// Un mensaje cobrable (billable) que Meta entrega prueba que el pago ya
// funciona. Se llama desde el webhook: aceptar el envio no alcanza, el cobro
// se resuelve despues.
export async function clearPaymentFailed(service: SupabaseClient, phoneNumberId: string) {
  await service
    .from('whatsapp_accounts')
    .update({ payment_failed_at: null })
    .eq('phone_number_id', phoneNumberId)
    .not('payment_failed_at', 'is', null)
}
