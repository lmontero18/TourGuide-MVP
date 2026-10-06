import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Logger } from '@/lib/logger'
import { appUrl, orgRecipients, sendOnce } from '@/lib/email/notify'
import { box, esc, layout, p } from '@/lib/email/layout'

// Motivos de rechazo de Meta → sugerencia concreta para la agencia.
const REASON_HINT: Record<string, string> = {
  INCORRECT_CATEGORY: 'Meta considera que la categoría no corresponde. Si es una promoción, créala como Marketing; si es un aviso para un cliente que ya reservó, quita el tono promocional.',
  INVALID_FORMAT: 'Revisa el formato: variables bien escritas ({{nombre}}), sin variables al principio o al final del texto y con ejemplos para cada una.',
  ABUSIVE_CONTENT: 'Meta consideró el contenido inapropiado o engañoso. Reescríbelo con un tono más neutral.',
  SCAM: 'Meta lo marcó como posible estafa. Evita promesas exageradas y enlaces acortados.',
  PROMOTIONAL: 'Tiene contenido promocional en una categoría que no lo permite. Créala como Marketing.',
  TAG_CONTENT_MISMATCH: 'El contenido no coincide con la categoría elegida. Cambia la categoría o ajusta el texto.',
}

interface TemplateEvent {
  wabaId?: string
  event?: string
  name?: string
  language?: string
  templateId?: string | number
  reason?: string | null
}

// Meta aprobo o rechazo una plantilla: correo a los administradores.
export async function notifyTemplateStatus(service: SupabaseClient, ev: TemplateEvent, log: Logger) {
  const status = ev.event?.toUpperCase()
  if (!ev.wabaId || !ev.name || (status !== 'APPROVED' && status !== 'REJECTED')) return
  const { data: wa } = await service.from('whatsapp_accounts').select('org_id').eq('waba_id', ev.wabaId).maybeSingle()
  if (!wa?.org_id) return

  const approved = status === 'APPROVED'
  const reason = (ev.reason ?? '').toUpperCase()
  const hint = REASON_HINT[reason] ?? 'Revisa el texto y vuelve a crearla con otro nombre. Si no está claro por qué, escríbenos desde "Enviar comentarios".'
  const html = approved
    ? layout({
        title: 'Ya puedes usar tu plantilla',
        body: p(`Meta aprobó <b>${esc(ev.name)}</b>. Ya puedes enviarla desde cualquier conversación con más de 24 horas sin mensajes del cliente.`),
        cta: { label: 'Ver plantillas', url: `${appUrl()}/templates` },
      })
    : layout({
        title: 'Tu plantilla no fue aprobada',
        body:
          p(`Meta revisó <b>${esc(ev.name)}</b> y no la aprobó, así que todavía no se puede enviar.`) +
          box('Motivo de Meta', [esc(ev.reason && ev.reason !== 'NONE' ? ev.reason : 'Sin detalle')]) +
          box('Cómo corregirla', [esc(hint)]),
        cta: { label: 'Crear una nueva versión', url: `${appUrl()}/templates` },
      })

  await sendOnce(
    service,
    {
      orgId: wa.org_id,
      kind: approved ? 'template_approved' : 'template_rejected',
      dedupeKey: `template:${ev.templateId ?? ev.name}:${ev.language ?? ''}:${status}`,
      to: await orgRecipients(service, wa.org_id, { adminsOnly: true }),
      subject: approved ? `Tu plantilla "${ev.name}" ya está aprobada` : `Meta rechazó tu plantilla "${ev.name}"`,
      html,
    },
    log.child({ org_id: wa.org_id })
  )
}
