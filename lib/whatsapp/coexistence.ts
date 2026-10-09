import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Logger } from '@/lib/logger'

// Coexistencia (CODE-190): el numero de la agencia sigue en la app WhatsApp
// Business del celular y a la vez conectado a Tourfy. Meta manda por webhook
// lo que pasa en el celular:
// - smb_message_echoes: mensajes que la agencia envia desde la app.
// - smb_app_state_sync: contactos de la agenda del celular.
// Doc: developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users

const digits = z.string().regex(/^\d{6,20}$/)
const caption = z.looseObject({ caption: z.string().max(4096).optional() }).optional()

// Un echo tiene la forma de un mensaje entrante, pero `to` es el cliente y
// `from` el numero de la agencia.
export const messageEchoSchema = z.looseObject({
  to: digits,
  id: z.string().min(1).max(256),
  type: z.string().max(32),
  timestamp: z.string().max(20).optional(),
  text: z.looseObject({ body: z.string().max(8192) }).optional(),
  image: caption,
  video: caption,
  document: z
    .looseObject({ filename: z.string().max(512).optional(), caption: z.string().max(4096).optional() })
    .optional(),
})

export const stateSyncItemSchema = z.looseObject({
  type: z.string().max(32),
  action: z.string().max(16).optional(),
  contact: z
    .looseObject({
      full_name: z.string().max(512).optional(),
      first_name: z.string().max(512).optional(),
      phone_number: z.string().max(32),
    })
    .optional(),
})

type MessageEcho = z.infer<typeof messageEchoSchema>

const PLACEHOLDER: Record<string, string> = {
  image: 'Imagen',
  video: 'Video',
  audio: 'Audio',
  sticker: 'Sticker',
  location: 'Ubicación',
  contacts: 'Contacto',
}

function echoContent(echo: MessageEcho): string {
  if (echo.type === 'text') return echo.text?.body ?? ''
  if (echo.type === 'document') {
    const doc = echo.document
    return `[Documento: ${doc?.filename ?? 'archivo'}]${doc?.caption ? ` ${doc.caption}` : ''}`
  }
  const label = PLACEHOLDER[echo.type]
  if (!label) return `[${echo.type}]`
  const text = (echo.type === 'image' ? echo.image : echo.type === 'video' ? echo.video : undefined)?.caption
  return `[${label}]${text ? ` ${text}` : ''}`
}

// Meta manda segundos Unix como string. Si no viene o no es valido, ahora.
function echoTimestamp(echo: MessageEcho): string {
  const seconds = Number(echo.timestamp)
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString()
}

// La agencia le escribio a un cliente desde el celular. El mensaje entra al
// inbox como de un agente y el bot se pausa en esa conversacion: alguien del
// equipo esta atendiendo, igual que al tomar el control desde el panel. Sin
// agente asignado (no sabemos quien tenia el celular).
export async function applyMessageEchoes(
  service: SupabaseClient,
  orgId: string,
  rawEchoes: unknown[],
  log: Logger
) {
  for (const raw of rawEchoes) {
    const parsed = messageEchoSchema.safeParse(raw)
    if (!parsed.success) {
      log.warn('message echo failed validation — skipped', { issues: parsed.error.issues })
      continue
    }
    const echo = parsed.data

    // Idempotencia por wamid, igual que los mensajes entrantes.
    const { data: dupe } = await service
      .from('messages')
      .select('id')
      .eq('wa_message_id', echo.id)
      .maybeSingle()
    if (dupe) continue

    const sentAt = echoTimestamp(echo)

    const { data: contact } = await service
      .from('contacts')
      // Sin last_seen_at: marca cuando escribio el cliente, no la agencia.
      .upsert({ org_id: orgId, phone: echo.to }, { onConflict: 'org_id,phone' })
      .select('id')
      .single()
    if (!contact) continue

    const { data: existing } = await service
      .from('conversations')
      .select('id')
      .eq('org_id', orgId)
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Resuelta, eliminada o esperando agente: la agencia la esta atendiendo,
    // vuelve al inbox como abierta y con el bot pausado.
    const fields = { status: 'open', bot_active: false, deleted_at: null, last_message_at: sentAt }
    const { data: conversation, error: convError } = existing
      ? await service.from('conversations').update(fields).eq('id', existing.id).select('id').single()
      : await service
          .from('conversations')
          .insert({ org_id: orgId, contact_id: contact.id, ...fields })
          .select('id')
          .single()
    if (convError || !conversation) {
      log.error('message echo: conversation upsert failed', { error: convError, wamid: echo.id })
      continue
    }

    const { error: insertError } = await service.from('messages').insert({
      conversation_id: conversation.id,
      role: 'agent',
      content: echoContent(echo).slice(0, 8192),
      from_bot: false,
      wa_message_id: echo.id,
      delivery_status: 'sent',
      created_at: sentAt,
    })
    // 23505: un reintento concurrente de Meta ya lo inserto.
    if (insertError && insertError.code !== '23505') {
      log.error('message echo insert failed', { error: insertError, conversation_id: conversation.id, wamid: echo.id })
    }
  }
}

// Contactos de la agenda del celular. Solo completa el nombre de contactos sin
// nombre y agrega los nuevos; nunca borra (un 'remove' en el celular no debe
// tocar contactos con conversaciones en Tourfy).
export async function applyContactSync(
  service: SupabaseClient,
  orgId: string,
  rawItems: unknown[],
  log: Logger
) {
  const names = new Map<string, string>()
  for (const raw of rawItems) {
    const parsed = stateSyncItemSchema.safeParse(raw)
    if (!parsed.success || parsed.data.type !== 'contact' || parsed.data.action === 'remove') continue
    const contact = parsed.data.contact
    if (!contact) continue
    // Mismo formato que manda Meta en los mensajes: solo digitos, sin '+'.
    const phone = contact.phone_number.replace(/\D/g, '')
    const name = (contact.full_name || contact.first_name)?.trim()
    if (/^\d{6,20}$/.test(phone) && name) names.set(phone, name.slice(0, 256))
  }
  if (names.size === 0) return

  // Una agenda puede traer miles de contactos: de a lotes para no pasarnos
  // del largo de URL del filtro .in().
  const phones = [...names.keys()]
  let inserted = 0
  for (let i = 0; i < phones.length; i += CONTACT_BATCH) {
    const batch = phones.slice(i, i + CONTACT_BATCH)
    const { data: existing, error } = await service
      .from('contacts')
      .select('id, phone, name')
      .eq('org_id', orgId)
      .in('phone', batch)
    if (error) {
      log.error('contact sync: lookup failed', { error })
      return
    }

    const known = new Set((existing ?? []).map((c) => c.phone as string))
    const toInsert = batch
      .filter((phone) => !known.has(phone))
      .map((phone) => ({ org_id: orgId, phone, name: names.get(phone) }))
    if (toInsert.length > 0) {
      const { error: insertError } = await service
        .from('contacts')
        .upsert(toInsert, { onConflict: 'org_id,phone', ignoreDuplicates: true })
      if (insertError) log.error('contact sync: insert failed', { error: insertError })
      else inserted += toInsert.length
    }

    for (const c of existing ?? []) {
      if (c.name) continue
      const { error: updateError } = await service
        .from('contacts')
        .update({ name: names.get(c.phone as string) })
        .eq('id', c.id)
      if (updateError) log.warn('contact sync: name update failed', { error: updateError, contact_id: c.id })
    }
  }

  log.info('contact sync applied', { received: names.size, inserted })
}

const CONTACT_BATCH = 200
