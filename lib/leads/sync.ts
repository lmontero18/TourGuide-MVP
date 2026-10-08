import 'server-only'
import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'
import { extractLead, type ExtractedLead, type TranscriptLine } from '@/lib/leads/extract'
import type { LeadDetails, LeadField, LeadStatus } from '@/types'

const log = createLogger({ module: 'leads' })

// Varias respuestas seguidas del bot no disparan una extraccion cada una.
const THROTTLE_MS = 30 * 1000
const TRANSCRIPT_MESSAGES = 40

const DETAIL_KEYS: (keyof LeadDetails)[] = ['travel_date', 'group_size', 'quote', 'pickup', 'needs', 'language']
// La IA solo avanza por estas etapas; reservado/perdido los marca una persona.
const AUTO_ORDER: Partial<Record<LeadStatus, number>> = { new: 0, contacted: 1, qualified: 2 }

interface LeadRow {
  id: string
  status: LeadStatus
  tour_interest: string | null
  metadata: LeadDetails | null
  summary: string | null
  next_step: string | null
  locked_fields: LeadField[] | null
  extracted_at: string | null
  closed_at: string | null
}

const LEAD_COLUMNS = 'id, status, tour_interest, metadata, summary, next_step, locked_fields, extracted_at, closed_at'

// Lead abierto de la conversacion; lo crea si la conversacion nunca tuvo uno.
// null = su ultimo lead esta cerrado (reservado/perdido): si el cliente vuelve
// con una oportunidad nueva lo decide maybeReopen, no cualquier mensaje.
export async function ensureOpenLead(
  service: SupabaseClient,
  conv: { id: string; org_id: string; contact_id: string }
): Promise<LeadRow | null> {
  const { data: latest } = await service
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lead = latest as LeadRow | null
  if (lead && lead.status !== 'converted' && lead.status !== 'lost') return lead
  if (lead) return null

  const { data: created, error } = await service
    .from('leads')
    .insert({ org_id: conv.org_id, contact_id: conv.contact_id, conversation_id: conv.id, status: 'new' })
    .select(LEAD_COLUMNS)
    .single()

  if (error) {
    // 23505 = otro request creo el lead abierto en paralelo (indice unico).
    if (error.code === '23505') {
      const { data } = await service
        .from('leads')
        .select(LEAD_COLUMNS)
        .eq('conversation_id', conv.id)
        .not('status', 'in', '(converted,lost)')
        .maybeSingle()
      return data as LeadRow | null
    }
    throw new Error(`lead insert failed: ${error.message}`)
  }
  return created as LeadRow
}

function nextStatus(current: LeadStatus, extracted: ExtractedLead): LeadStatus {
  if (AUTO_ORDER[current] === undefined) return current
  const target: LeadStatus =
    extracted.intent === 'ready'
      ? 'qualified'
      : extracted.intent === 'quoting' || (extracted.tour_interest && (extracted.travel_date || extracted.group_size))
        ? 'contacted'
        : 'new'
  return (AUTO_ORDER[target] ?? 0) > (AUTO_ORDER[current] ?? 0) ? target : current
}

const REOPEN_NOTE =
  "Contexto: este cliente ya reservó o se descartó antes; estos son solo los mensajes nuevos. Si el cliente pide información de tours (aunque sea general, por tipo o por curiosidad), precios, fechas o quiere reservar otra vez, es una oportunidad nueva: usa intent browsing, quoting o ready y completa tour_interest con lo que le interesa (puede ser un tipo de tour, ej. 'Treks: Mombacho Crater Trail / Puma Trails'). Si únicamente saluda, agradece, confirma algo de la reserva anterior o comenta su viaje ya hecho, usa intent = null y deja los demás campos en null. No cuentes como interés del cliente los tours que solo ofrece el bot sin que el cliente los pida."

// Cliente con el lead cerrado que vuelve a escribir: la IA lee solo los
// mensajes nuevos y, si hay una oportunidad nueva (pide un tour, una fecha,
// un precio o reservar otra vez), se abre un lead nuevo con su ficha. Un
// "gracias" no abre nada.
async function maybeReopen(
  service: SupabaseClient,
  conv: { id: string; org_id: string; contact_id: string; last_message_at: string | null },
  opts: { force?: boolean }
) {
  const { data: closed } = await service
    .from('leads')
    .select('id, closed_at, extracted_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!closed?.closed_at) return

  // Ultima revision: el cierre o el ultimo chequeo, lo que sea mas nuevo.
  const checkedAt = [closed.closed_at, closed.extracted_at].filter(Boolean).sort().at(-1) as string
  if (!opts.force) {
    if (conv.last_message_at && new Date(conv.last_message_at) <= new Date(checkedAt)) return
    if (closed.extracted_at && Date.now() - new Date(closed.extracted_at).getTime() < THROTTLE_MS) return
  }

  const [{ data: msgs }, { data: org }] = await Promise.all([
    service
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conv.id)
      .gt('created_at', closed.closed_at)
      .order('created_at', { ascending: true })
      .limit(TRANSCRIPT_MESSAGES),
    service.from('organizations').select('tours, bot_config').eq('id', conv.org_id).single(),
  ])
  const transcript = (msgs ?? []) as TranscriptLine[]
  if (!transcript.some((m) => m.role === 'user')) return

  const timezone = (org?.bot_config as { timezone?: string } | null)?.timezone || 'America/Managua'
  const today = new Intl.DateTimeFormat('es', { timeZone: timezone, dateStyle: 'full' }).format(new Date())
  const tourNames = ((org?.tours ?? []) as { name?: string }[]).map((t) => t.name?.trim()).filter((n): n is string => !!n)
  const extracted = await extractLead({ transcript, tourNames, today, timezone, note: REOPEN_NOTE })

  // Marca el chequeo en el lead cerrado para no releer lo mismo.
  await service.from('leads').update({ extracted_at: new Date().toISOString() }).eq('id', closed.id)

  // El modelo marca intent solo si el cliente pide algo nuevo (ver REOPEN_NOTE).
  if (extracted.intent === null) return

  const metadata: LeadDetails = {}
  for (const key of DETAIL_KEYS) metadata[key] = extracted[key] ?? null
  const { error } = await service.from('leads').insert({
    org_id: conv.org_id,
    contact_id: conv.contact_id,
    conversation_id: conv.id,
    status: nextStatus('new', extracted),
    tour_interest: extracted.tour_interest,
    metadata,
    summary: extracted.summary,
    next_step: extracted.next_step,
    intent: extracted.intent,
    extracted_at: new Date().toISOString(),
  })
  // 23505 = otro request ya abrio el lead nuevo (indice unico de lead abierto).
  if (error && error.code !== '23505') throw new Error(`lead reopen failed: ${error.message}`)
}

// Vuelve a leer la conversacion y actualiza la ficha del lead abierto. Lo
// llaman las rutas despues de responder (after()), asi que nunca tira.
export async function refreshLead(
  service: SupabaseClient,
  conversationId: string,
  opts: { force?: boolean } = {}
): Promise<void> {
  try {
    const { data: conv } = await service
      .from('conversations')
      .select('id, org_id, contact_id, last_message_at')
      .eq('id', conversationId)
      .maybeSingle()
    if (!conv) return

    const lead = await ensureOpenLead(service, conv)
    if (!lead) {
      await maybeReopen(service, conv, opts)
      return
    }

    if (!opts.force && lead.extracted_at) {
      const since = Date.now() - new Date(lead.extracted_at).getTime()
      const nothingNew = conv.last_message_at && new Date(conv.last_message_at) <= new Date(lead.extracted_at)
      if (since < THROTTLE_MS || nothingNew) return
    }

    // Lead reabierto (el cliente volvio despues de reservar o descartarse): la
    // ficha se arma solo con los mensajes posteriores al cierre anterior. Sin
    // esto, la IA mezclaba la oportunidad vieja (tour, grupo, pagos) con la
    // nueva.
    const { data: prevClosed } = await service
      .from('leads')
      .select('closed_at')
      .eq('conversation_id', conversationId)
      .neq('id', lead.id)
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let msgQuery = service
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
    if (prevClosed?.closed_at) msgQuery = msgQuery.gt('created_at', prevClosed.closed_at)

    const [{ data: msgs }, { data: org }] = await Promise.all([
      msgQuery.order('created_at', { ascending: false }).limit(TRANSCRIPT_MESSAGES),
      service.from('organizations').select('tours, bot_config').eq('id', conv.org_id).single(),
    ])
    const transcript = ((msgs ?? []) as TranscriptLine[]).reverse()
    if (!transcript.some((m) => m.role === 'user')) return

    const timezone = (org?.bot_config as { timezone?: string } | null)?.timezone || 'America/Managua'
    const today = new Intl.DateTimeFormat('es', { timeZone: timezone, dateStyle: 'full' }).format(new Date())
    const tourNames = ((org?.tours ?? []) as { name?: string }[]).map((t) => t.name?.trim()).filter((n): n is string => !!n)

    const extracted = await extractLead({ transcript, tourNames, today, timezone })

    // Lo que edito una persona manda: la IA no pisa campos bloqueados. En la
    // actualizacion automatica un null de la IA no borra un dato que ya
    // teniamos (puede haber salido de la ventana de mensajes); "Actualizar con
    // IA" (force) rehace la ficha desde cero, asi limpia datos viejos o mal
    // extraidos.
    const locked = new Set(lead.locked_fields ?? [])
    const keep = <T,>(field: LeadField, prev: T | null | undefined, next: T | null) =>
      locked.has(field) ? (prev ?? null) : opts.force ? (next ?? null) : (next ?? prev ?? null)

    const metadata: LeadDetails = { ...(lead.metadata ?? {}) }
    for (const key of DETAIL_KEYS) metadata[key] = keep(key, lead.metadata?.[key], extracted[key] ?? null)

    const { error } = await service
      .from('leads')
      .update({
        tour_interest: keep('tour_interest', lead.tour_interest, extracted.tour_interest),
        metadata,
        summary: keep('summary', lead.summary, extracted.summary),
        next_step: keep('next_step', lead.next_step, extracted.next_step),
        intent: extracted.intent,
        status: nextStatus(lead.status, extracted),
        extracted_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
    if (error) throw new Error(`lead update failed: ${error.message}`)
  } catch (error) {
    log.error('lead refresh failed', { error, conversation_id: conversationId })
    Sentry.captureException(error, { tags: { module: 'leads' }, extra: { conversation_id: conversationId } })
  }
}
