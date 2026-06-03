import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/whatsapp/verify'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — Webhook verification (Meta sends a challenge when registering)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Receive incoming messages
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Validate signature
  const signature = request.headers.get('x-hub-signature-256')
  if (!signature || !verifyWebhookSignature(rawBody, signature, process.env.META_APP_SECRET!)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Always respond 200 immediately — process async
  const body = JSON.parse(rawBody)

  try {
    await processWebhook(body)
  } catch (error) {
    console.error('Webhook processing error:', error)
    // Still return 200 to prevent Meta retries
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function callN8nBot(params: {
  org_id: string
  conversation_id: string
  contact_phone: string
  phone_number_id: string
  access_token: string
  message: string
  system_prompt: string
  n8n_secret: string
  callback_base_url: string
}) {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch {
    // Non-critical — log but don't throw
    console.error('callN8nBot failed')
  }
}

async function processWebhook(body: Record<string, unknown>) {
  const supabase = getServiceClient()
  const entries = body.entry as Array<Record<string, unknown>> | undefined
  if (!entries) return

  for (const entry of entries) {
    const changes = entry.changes as Array<Record<string, unknown>> | undefined
    if (!changes) continue

    for (const change of changes) {
      const value = change.value as Record<string, unknown>
      if (!value) continue

      const metadata = value.metadata as { phone_number_id?: string } | undefined
      const messages = value.messages as Array<Record<string, unknown>> | undefined
      const contactsPayload = value.contacts as Array<{ wa_id?: string; profile?: { name?: string } }> | undefined

      if (!metadata?.phone_number_id || !messages) continue

      // Find org by phone_number_id
      const { data: waAccount } = await supabase
        .from('whatsapp_accounts')
        .select('org_id, phone_number_id, access_token')
        .eq('phone_number_id', metadata.phone_number_id)
        .single()

      if (!waAccount) {
        console.error(`No WhatsApp account found for phone_number_id: ${metadata.phone_number_id}`)
        continue
      }

      // Map wa_id -> profile name from the webhook contacts array
      const nameByWaId = new Map<string, string>()
      for (const c of contactsPayload ?? []) {
        if (c.wa_id && c.profile?.name) nameByWaId.set(c.wa_id, c.profile.name)
      }

      for (const message of messages) {
        const from = message.from as string
        const type = message.type as string
        const messageId = message.id as string
        const profileName = nameByWaId.get(from) ?? null

        // Extract text content
        let content = ''
        if (type === 'text') {
          const text = message.text as { body?: string }
          content = text?.body ?? ''
        } else if (type === 'interactive') {
          const interactive = message.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } }
          content = interactive?.button_reply?.title ?? interactive?.list_reply?.title ?? `[${type}]`
        } else if (type === 'audio') {
          try {
            const { getMessagingToken } = await import('@/lib/whatsapp/token')
            const tok = getMessagingToken(waAccount)
            const audioId = (message.audio as { id?: string })?.id
            if (audioId && tok) {
              const mediaRes = await fetch(
                `https://graph.facebook.com/v21.0/${audioId}`,
                { headers: { Authorization: `Bearer ${tok}` } }
              )
              const mediaData = await mediaRes.json() as { url?: string }
              if (mediaData.url) {
                const audioRes = await fetch(mediaData.url, {
                  headers: { Authorization: `Bearer ${tok}` }
                })
                const audioBuffer = await audioRes.arrayBuffer()
                const { OpenAI } = await import('openai')
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
                const transcript = await openai.audio.transcriptions.create({
                  file: new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' }),
                  model: 'whisper-1',
                })
                content = transcript.text
              }
            }
          } catch {
            content = '[audio]'
          }
        } else {
          content = `[${type}]`
        }

        // Look up existing contact to decide whether to set name
        const { data: existing } = await supabase
          .from('contacts')
          .select('id, name')
          .eq('org_id', waAccount.org_id)
          .eq('phone', from)
          .maybeSingle()

        const nowIso = new Date().toISOString()
        const shouldSetName = profileName && (!existing || !existing.name)

        const { data: contact } = await supabase
          .from('contacts')
          .upsert(
            {
              org_id: waAccount.org_id,
              phone: from,
              last_seen_at: nowIso,
              ...(shouldSetName ? { name: profileName } : {}),
            },
            { onConflict: 'org_id,phone' }
          )
          .select('id')
          .single()

        if (!contact) continue

        // Find or create conversation
        let { data: conversation } = await supabase
          .from('conversations')
          .select('id, bot_active')
          .eq('org_id', waAccount.org_id)
          .eq('contact_id', contact.id)
          .neq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!conversation) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              org_id: waAccount.org_id,
              contact_id: contact.id,
              status: 'open',
              bot_active: true,
              last_message_at: new Date().toISOString(),
            })
            .select('id, bot_active')
            .single()

          conversation = newConv
        } else {
          // Update last_message_at
          await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversation.id)
        }

        if (!conversation) continue

        // Insert message
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'user',
          content,
          from_bot: false,
        })

        // Call N8N bot if active and we have processable content
        if (conversation.bot_active && content && content !== '[audio]') {
          const { data: org } = await supabase
            .from('organizations')
            .select('prompt')
            .eq('id', waAccount.org_id)
            .single()

          const { getMessagingToken } = await import('@/lib/whatsapp/token')
          const tok = getMessagingToken(waAccount)

          await callN8nBot({
            org_id: waAccount.org_id,
            conversation_id: conversation.id,
            contact_phone: from,
            phone_number_id: metadata.phone_number_id,
            access_token: tok ?? waAccount.access_token,
            message: content,
            system_prompt: org?.prompt ?? '',
            n8n_secret: process.env.N8N_INTERNAL_SECRET ?? '',
            callback_base_url: process.env.TOURGUIDE_API_URL ?? '',
          })
        }

        // Mark as read in WhatsApp
        if (messageId) {
          const { markAsRead } = await import('@/lib/whatsapp/client')
          const { getMessagingToken } = await import('@/lib/whatsapp/token')
          const token = getMessagingToken(waAccount)
          if (token) {
            await markAsRead(metadata.phone_number_id, token, messageId).catch(() => {
              // Non-critical, don't fail the webhook
            })
          }
        }
      }
    }
  }
}
