import 'server-only'
import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'
import { extractLead, type ExtractedLead, type TranscriptLine } from '@/lib/leads/extract'
import type { LeadDetails, LeadField, LeadStatus } from '@/types'

const log = createLogger({ module: 'leads' })

// Un cliente que reservo y escribe "gracias" al dia siguiente no es una
// oportunidad nueva: durante esta ventana se queda en el lead cerrado.
const REOPEN_AFTER_MS = 7 * 24 * 60 * 60 * 1000
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

// Lead abierto de la conversacion; lo crea si no hay. null = la conversacion
// tuvo un lead cerrado hace poco (no se abre otro).
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
  if (lead?.closed_at && Date.now() - new Date(lead.closed_at).getTime() < REOPEN_AFTER_MS) return null

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
    if (!lead) return

    if (!opts.force && lead.extracted_at) {
      const since = Date.now() - new Date(lead.extracted_at).getTime()
      const nothingNew = conv.last_message_at && new Date(conv.last_message_at) <= new Date(lead.extracted_at)
      if (since < THROTTLE_MS || nothingNew) return
    }

    const [{ data: msgs }, { data: org }] = await Promise.all([
      service
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(TRANSCRIPT_MESSAGES),
      service.from('organizations').select('tours, bot_config').eq('id', conv.org_id).single(),
    ])
    const transcript = ((msgs ?? []) as TranscriptLine[]).reverse()
    if (!transcript.some((m) => m.role === 'user')) return

    const timezone = (org?.bot_config as { timezone?: string } | null)?.timezone || 'America/Managua'
    const today = new Intl.DateTimeFormat('es', { timeZone: timezone, dateStyle: 'full' }).format(new Date())
    const tourNames = ((org?.tours ?? []) as { name?: string }[]).map((t) => t.name?.trim()).filter((n): n is string => !!n)

    const extracted = await extractLead({ transcript, tourNames, today, timezone })

    // Lo que edito una persona manda: la IA no pisa campos bloqueados, y un
    // null de la IA no borra un dato que ya teniamos.
    const locked = new Set(lead.locked_fields ?? [])
    const keep = <T,>(field: LeadField, prev: T | null | undefined, next: T | null) =>
      locked.has(field) ? (prev ?? null) : (next ?? prev ?? null)

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
