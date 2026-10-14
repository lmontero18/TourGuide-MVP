import { NextRequest, NextResponse, after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp/client'
import { createLogger } from '@/lib/logger'
import { refreshLead } from '@/lib/leads/sync'
import { prepareAgentSend, sendErrorResponse } from '@/lib/conversations/agentSend'

const log = createLogger({ route: 'conversations/[id]/messages' })

const sendSchema = z.object({
  content: z.string().trim().min(1).max(4096),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const t = await getTranslations('apiErrors')

  const parsed = sendSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: t('invalidInput') }, { status: 400 })
  }

  const prep = await prepareAgentSend(id, t)
  if (!prep.ok) return prep.response
  const { supabase, userId, orgId, to, phoneNumberId, token } = prep.ctx

  // wamid de Meta: el webhook lo usa para marcar entregado / leido / fallido.
  let wamid: string | null = null
  try {
    const sent = await sendTextMessage(phoneNumberId, token, to, parsed.data.content)
    wamid = sent.messages?.[0]?.id ?? null
  } catch (err) {
    return sendErrorResponse(err, orgId, t, log)
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
      sender_id: userId,
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
