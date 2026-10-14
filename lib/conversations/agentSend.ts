import { NextResponse } from 'next/server'
import type { getTranslations } from 'next-intl/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMessagingToken } from '@/lib/whatsapp/token'
import { isPaymentError, markPaymentFailed } from '@/lib/whatsapp/billing'
import type { Logger } from '@/lib/logger'

// Chequeos compartidos antes de que un agente le mande algo al cliente desde
// el panel (texto o archivo): sesion, org, conversacion, bot pausado, ventana
// de 24h, quien la atiende (y tomarla si no tiene dueño), numero conectado y
// token. Los routes validan su body ANTES de llamar a esto: el claim de la
// conversacion es una escritura y no debe pasar si el pedido es invalido.

type T = Awaited<ReturnType<typeof getTranslations<'apiErrors'>>>
type Supabase = Awaited<ReturnType<typeof createClient>>

// Ventana de atencion de WhatsApp: 24h desde el ultimo mensaje del cliente.
const WINDOW_MS = 24 * 60 * 60 * 1000

export interface AgentSendContext {
  supabase: Supabase
  userId: string
  orgId: string
  conversationId: string
  to: string
  phoneNumberId: string
  token: string
}

export type AgentSendResult = { ok: true; ctx: AgentSendContext } | { ok: false; response: NextResponse }

const fail = (body: Record<string, unknown>, status: number): AgentSendResult => ({
  ok: false,
  response: NextResponse.json(body, { status }),
})

export async function getAgentOrg(supabase: Supabase): Promise<{ userId: string; orgId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) return null
  return { userId: user.id, orgId: profile.org_id }
}

export async function prepareAgentSend(conversationId: string, t: T): Promise<AgentSendResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail({ error: t('unauthorized') }, 401)

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return fail({ error: t('forbidden') }, 403)

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, org_id, contact_id, bot_active, assigned_agent_id, contact:contacts(phone)')
    .eq('id', conversationId)
    .single<{
      id: string
      org_id: string
      contact_id: string
      bot_active: boolean
      assigned_agent_id: string | null
      contact: { phone: string } | null
    }>()

  if (!conv || conv.org_id !== profile.org_id) {
    return fail({ error: t('conversationNotFound') }, 404)
  }

  if (conv.bot_active) return fail({ error: t('takeControlFirst') }, 400)

  // Ventana de 24h de Meta (CODE-176): texto libre solo hasta 24h despues del
  // ultimo mensaje del cliente. Se chequea antes de tomar la conversacion y
  // de llamar a Graph, para devolver un error claro en vez del de Meta.
  const { data: lastClientMsg } = await supabase
    .from('messages')
    .select('created_at')
    .eq('conversation_id', conv.id)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!lastClientMsg || Date.now() - new Date(lastClientMsg.created_at).getTime() > WINDOW_MS) {
    return fail({ error: t('windowClosed'), code: 'window_closed' }, 409)
  }

  // Solo escribe quien atiende la conversacion: si no, dos agentes podian
  // contestarle al mismo cliente a la vez.
  if (conv.assigned_agent_id && conv.assigned_agent_id !== user.id) {
    return fail({ error: t('takenByOther'), code: 'not_assignee' }, 403)
  }

  // Responder = tomar la conversacion. Sin dueño (tipicamente "esperando
  // agente" tras un handoff del bot), el primer agente que responde queda
  // asignado y la conversacion pasa a abierta. Atomico: si otro la tomo en el
  // medio, el update no matchea y este mensaje no se envia.
  if (!conv.assigned_agent_id) {
    const { data: claimed } = await supabase
      .from('conversations')
      .update({ assigned_agent_id: user.id, status: 'open' })
      .eq('id', conv.id)
      .eq('org_id', profile.org_id)
      .is('assigned_agent_id', null)
      .select('id')
      .maybeSingle()
    if (!claimed) return fail({ error: t('takenByOther'), code: 'not_assignee' }, 403)
  }

  if (!conv.contact?.phone) return fail({ error: t('contactPhoneMissing') }, 400)

  const { data: wa } = await supabase
    .from('whatsapp_accounts')
    .select('phone_number_id')
    .eq('org_id', profile.org_id)
    .single()

  if (!wa) return fail({ error: t('whatsappNotConnected') }, 400)

  const token = getMessagingToken()
  if (!token) return fail({ error: t('messagingTokenMissing') }, 500)

  return {
    ok: true,
    ctx: {
      supabase,
      userId: user.id,
      orgId: profile.org_id,
      conversationId: conv.id,
      to: conv.contact.phone,
      phoneNumberId: wa.phone_number_id,
      token,
    },
  }
}

// Error de Graph al enviar → respuesta con texto propio. El detalle de Meta
// (en ingles) queda en el log.
export async function sendErrorResponse(err: unknown, orgId: string, t: T, log: Logger): Promise<NextResponse> {
  console.error('WhatsApp send failed:', err)
  const message = err instanceof Error ? err.message : ''
  // 131047 = Meta rechazo por ventana de 24h (por si el reloj difiere del nuestro).
  if (message.includes('131047')) {
    return NextResponse.json({ error: t('windowClosed'), code: 'window_closed' }, { status: 409 })
  }
  if (isPaymentError(err)) {
    await markPaymentFailed(await createServiceClient(), { orgId }, log.child({ org_id: orgId }))
    return NextResponse.json({ error: t('paymentRequired'), code: 'payment_required' }, { status: 402 })
  }
  return NextResponse.json({ error: t('sendFailed') }, { status: 502 })
}
