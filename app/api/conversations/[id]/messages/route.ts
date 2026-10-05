import { NextRequest, NextResponse, after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp/client'
import { getMessagingToken } from '@/lib/whatsapp/token'
import { isPaymentError, markPaymentFailed } from '@/lib/whatsapp/billing'
import { createLogger } from '@/lib/logger'
import { refreshLead } from '@/lib/leads/sync'

const log = createLogger({ route: 'conversations/[id]/messages' })

// Ventana de atencion de WhatsApp: 24h desde el ultimo mensaje del cliente.
const WINDOW_MS = 24 * 60 * 60 * 1000

const sendSchema = z.object({
  content: z.string().trim().min(1).max(4096),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: t('unauthorized') }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: t('forbidden') }, { status: 403 })
  }

  const parsed = sendSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, org_id, contact_id, bot_active, assigned_agent_id, contact:contacts(phone)')
    .eq('id', id)
    .single<{
      id: string
      org_id: string
      contact_id: string
      bot_active: boolean
      assigned_agent_id: string | null
      contact: { phone: string } | null
    }>()

  if (!conv || conv.org_id !== profile.org_id) {
    return NextResponse.json({ error: t('conversationNotFound') }, { status: 404 })
  }

  if (conv.bot_active) {
    return NextResponse.json(
      { error: t('takeControlFirst') },
      { status: 400 }
    )
  }

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
    return NextResponse.json(
      { error: t('windowClosed'), code: 'window_closed' },
      { status: 409 }
    )
  }

  // Solo escribe quien atiende la conversacion: si no, dos agentes podian
  // contestarle al mismo cliente a la vez.
  if (conv.assigned_agent_id && conv.assigned_agent_id !== user.id) {
    return NextResponse.json(
      { error: t('takenByOther'), code: 'not_assignee' },
      { status: 403 }
    )
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
    if (!claimed) {
      return NextResponse.json(
        { error: t('takenByOther'), code: 'not_assignee' },
        { status: 403 }
      )
    }
  }

  if (!conv.contact?.phone) {
    return NextResponse.json({ error: t('contactPhoneMissing') }, { status: 400 })
  }

  const { data: wa } = await supabase
    .from('whatsapp_accounts')
    .select('phone_number_id')
    .eq('org_id', profile.org_id)
    .single()

  if (!wa) {
    return NextResponse.json({ error: t('whatsappNotConnected') }, { status: 400 })
  }

  const token = getMessagingToken()
  if (!token) {
    return NextResponse.json({ error: t('messagingTokenMissing') }, { status: 500 })
  }

  // wamid de Meta: el webhook lo usa para marcar entregado / leido / fallido.
  let wamid: string | null = null
  try {
    const sent = await sendTextMessage(wa.phone_number_id, token, conv.contact.phone, parsed.data.content)
    wamid = sent.messages?.[0]?.id ?? null
  } catch (err) {
    console.error('WhatsApp send failed:', err)
    const message = err instanceof Error ? err.message : ''
    // 131047 = Meta rechazo por ventana de 24h (por si el reloj difiere del nuestro).
    if (message.includes('131047')) {
      return NextResponse.json(
        { error: t('windowClosed'), code: 'window_closed' },
        { status: 409 }
      )
    }
    if (isPaymentError(err)) {
      await markPaymentFailed(await createServiceClient(), { orgId: profile.org_id }, log.child({ org_id: profile.org_id }))
      return NextResponse.json(
        { error: t('paymentRequired'), code: 'payment_required' },
        { status: 402 }
      )
    }
    // El detalle de Meta (en ingles) queda en el log; al usuario, texto propio.
    return NextResponse.json(
      { error: t('sendFailed') },
      { status: 502 }
    )
  }

  const nowIso = new Date().toISOString()

  const { data: msg, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: id,
      role: 'agent',
      content: parsed.data.content,
      from_bot: false,
      wa_message_id: wamid,
      delivery_status: wamid ? 'sent' : null,
      sender_id: user.id,
    })
    .select('id, conversation_id, role, content, from_bot, channel, created_at, delivery_status')
    .single()

  if (insertError || !msg) {
    console.error('Failed to insert message:', insertError)
    return NextResponse.json({ error: t('messageNotSaved') }, { status: 500 })
  }

  await supabase
    .from('conversations')
    .update({ last_message_at: nowIso })
    .eq('id', id)

  // Lo que el agente acuerda (montos, fechas) tambien va a la ficha del lead.
  after(async () => refreshLead(await createServiceClient(), id))

  return NextResponse.json({ success: true, message: msg })
}
