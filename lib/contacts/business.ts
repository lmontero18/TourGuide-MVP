import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { orgHasFeature } from '@/lib/features'
import { classifyContact } from '@/lib/contacts/classify'
import type { TranscriptLine } from '@/lib/leads/extract'

// Contactos de negocio (flag businessContacts): agencias, proveedores o socios.
// El bot queda apagado con ellos en todas sus conversaciones y no crean leads.

const TRANSCRIPT_MESSAGES = 20
// Etapas que pone la IA sola: un lead asi de un negocio es ruido. Uno que una
// persona ya trabajo (monto, campos editados, reservado/perdido) se deja.
const AUTO_STAGES = ['new', 'contacted', 'qualified']

// true si el contacto es de negocio y la org tiene el flag. Con el flag
// apagado todo funciona como antes, aunque la columna diga 'business'.
export async function isBusinessContact(
  service: SupabaseClient,
  orgId: string,
  kind: string | null | undefined
): Promise<boolean> {
  return kind === 'business' && (await orgHasFeature(service, orgId, 'businessContacts'))
}

// Marca el contacto como negocio: bot apagado en sus conversaciones abiertas y
// fuera los leads que creo la IA. `locked` = lo decidio una persona.
export async function markBusiness(
  service: SupabaseClient,
  contactId: string,
  opts: { locked: boolean }
): Promise<void> {
  const { error } = await service
    .from('contacts')
    .update({ kind: 'business', ...(opts.locked ? { kind_locked: true } : {}) })
    .eq('id', contactId)
  if (error) throw new Error(`contact kind update failed: ${error.message}`)

  // Solo las que tiene el bot: una que atiende una persona ya tiene el bot
  // apagado, y una resuelta se reabre sin bot (webhook).
  const { error: convError } = await service
    .from('conversations')
    .update({ bot_active: false })
    .eq('contact_id', contactId)
    .eq('bot_active', true)
    .neq('status', 'resolved')
  if (convError) throw new Error(`business bot off failed: ${convError.message}`)

  const { error: leadError } = await service
    .from('leads')
    .delete()
    .eq('contact_id', contactId)
    .in('status', AUTO_STAGES)
    .is('amount', null)
    .eq('locked_fields', '{}')
  if (leadError) throw new Error(`business leads cleanup failed: ${leadError.message}`)
}

// Una persona corrigio: es un cliente. La IA no lo vuelve a cambiar. El bot no
// se prende solo: el agente decide si se la devuelve.
export async function markCustomer(service: SupabaseClient, contactId: string): Promise<void> {
  const { error } = await service
    .from('contacts')
    .update({ kind: 'customer', kind_locked: true })
    .eq('id', contactId)
  if (error) throw new Error(`contact kind update failed: ${error.message}`)
}

// Al traspaso a humano: si la IA dice que es un negocio, se marca. Devuelve
// true si el contacto quedo (o ya estaba) como negocio.
export async function classifyOnHandoff(
  service: SupabaseClient,
  conv: { id: string; org_id: string; contact_id: string }
): Promise<boolean> {
  if (!(await orgHasFeature(service, conv.org_id, 'businessContacts'))) return false

  const { data: contact } = await service
    .from('contacts')
    .select('kind, kind_locked')
    .eq('id', conv.contact_id)
    .maybeSingle()
  if (!contact) return false
  if (contact.kind === 'business') return true
  if (contact.kind_locked) return false

  const { data: msgs } = await service
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(TRANSCRIPT_MESSAGES)
  const transcript = ((msgs ?? []) as TranscriptLine[]).reverse()
  if (!transcript.some((m) => m.role === 'user')) return false

  if ((await classifyContact(transcript)) !== 'business') return false
  await markBusiness(service, conv.contact_id, { locked: false })
  return true
}
