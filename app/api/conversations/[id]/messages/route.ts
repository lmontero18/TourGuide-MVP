import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp/client'

const sendSchema = z.object({
  content: z.string().trim().min(1).max(4096),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = sendSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, org_id, contact_id, bot_active, contact:contacts(phone)')
    .eq('id', id)
    .single<{
      id: string
      org_id: string
      contact_id: string
      bot_active: boolean
      contact: { phone: string } | null
    }>()

  if (!conv || conv.org_id !== profile.org_id) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (conv.bot_active) {
    return NextResponse.json(
      { error: 'Take control of the conversation before sending a message' },
      { status: 400 }
    )
  }

  if (!conv.contact?.phone) {
    return NextResponse.json({ error: 'Contact phone missing' }, { status: 400 })
  }

  const { data: wa } = await supabase
    .from('whatsapp_accounts')
    .select('phone_number_id, access_token')
    .eq('org_id', profile.org_id)
    .single()

  if (!wa) {
    return NextResponse.json({ error: 'WhatsApp not connected for this organization' }, { status: 400 })
  }

  try {
    await sendTextMessage(wa.phone_number_id, wa.access_token, conv.contact.phone, parsed.data.content)
  } catch (err) {
    console.error('WhatsApp send failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send message via WhatsApp' },
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
    })
    .select('id, conversation_id, role, content, from_bot, channel, created_at')
    .single()

  if (insertError || !msg) {
    console.error('Failed to insert message:', insertError)
    return NextResponse.json({ error: 'Message sent but not saved locally' }, { status: 500 })
  }

  await supabase
    .from('conversations')
    .update({ last_message_at: nowIso })
    .eq('id', id)

  return NextResponse.json({ success: true, message: msg })
}
