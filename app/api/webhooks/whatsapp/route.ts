import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { verifyWebhookSignature } from '@/lib/whatsapp/verify'
import {
  webhookPayloadSchema,
  webhookMessageSchema,
  type WebhookPayload,
} from '@/lib/whatsapp/schemas'
import { checkRateLimit } from '@/lib/ratelimit'
import { createLogger, type Logger } from '@/lib/logger'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const baseLog = createLogger({ route: 'webhooks/whatsapp' })

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
  // Sin secret no hay forma de autenticar a Meta — fallar cerrado y alertar.
  // (Antes se usaba META_APP_SECRET! y un env vacío tiraba 500 por crash.)
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    baseLog.error('META_APP_SECRET not configured')
    Sentry.captureMessage('META_APP_SECRET missing', {
      level: 'fatal',
      tags: { route: 'webhooks/whatsapp' },
    })
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const rawBody = await request.text()

  // Validate signature
  const signature = request.headers.get('x-hub-signature-256')
  if (!signature || !verifyWebhookSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Payload inválido → 200 igual: nunca responder 4xx a tráfico ya firmado
  // por Meta — reintenta con backoff y termina deshabilitando el webhook.
  let body: WebhookPayload
  try {
    const parsed = webhookPayloadSchema.safeParse(JSON.parse(rawBody))
    if (!parsed.success) {
      baseLog.warn('webhook payload failed validation', { issues: parsed.error.issues })
      Sentry.captureMessage('webhook payload failed validation', {
        level: 'warning',
        tags: { route: 'webhooks/whatsapp' },
      })
      return NextResponse.json({ status: 'invalid_payload' }, { status: 200 })
    }
    body = parsed.data
  } catch {
    baseLog.warn('webhook body is not valid JSON')
    return NextResponse.json({ status: 'invalid_payload' }, { status: 200 })
  }

  // Rate limit por phone_number_id. Excedido → 200 + drop, no 429: non-2xx
  // sostenido hace que Meta reintente (thundering herd) y pueda deshabilitar
  // la suscripción. La firma ya validó, el drop solo afecta al número que
  // floodea. Redis caído → fail open (ver lib/ratelimit.ts).
  const phoneNumberIds = [
    ...new Set(
      (body.entry ?? [])
        .flatMap((entry) => entry.changes ?? [])
        .map((change) => change.value?.metadata?.phone_number_id)
        .filter((id): id is string => !!id)
    ),
  ]
  if (phoneNumberIds.length > 0) {
    const allowed = await Promise.all(
      phoneNumberIds.map((id) => checkRateLimit('webhook', id))
    )
    if (!allowed.some(Boolean)) {
      baseLog.warn('webhook rate limited', { phone_number_ids: phoneNumberIds })
      Sentry.captureMessage('webhook rate limited', {
        level: 'warning',
        tags: { route: 'webhooks/whatsapp' },
        extra: { phone_number_ids: phoneNumberIds },
      })
      return NextResponse.json({ status: 'rate_limited' }, { status: 200 })
    }
  }

  // Responder 200 de inmediato y procesar despues de enviar la respuesta —
  // descargas/vision pueden tardar y Meta reintenta si el webhook demora.
  after(async () => {
    try {
      await processWebhook(body)
    } catch (error) {
      // Red de seguridad: los errores por-mensaje ya se capturan adentro con
      // org_id. Meta ya recibio 200, asi que nadie reintenta — sin esta
      // captura el error muere en los logs de Vercel sin alerta.
      baseLog.error('webhook processing failed', { error })
      Sentry.captureException(error, { tags: { route: 'webhooks/whatsapp' } })
      await Sentry.flush(2000)
    }
  })

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function callN8nBot(
  params: {
    org_id: string
    conversation_id: string
    contact_phone: string
    phone_number_id: string
    access_token: string
    message: string
    system_prompt: string
    n8n_secret: string
    callback_base_url: string
  },
  log: Logger
) {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) {
    log.warn('N8N_WEBHOOK_URL not set — bot call skipped')
    return
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      // Si N8N se cuelga no podemos bloquear el after() del webhook.
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      log.error('callN8nBot: N8N returned non-2xx', {
        status: res.status,
        conversation_id: params.conversation_id,
      })
      Sentry.captureMessage('callN8nBot: N8N returned non-2xx', {
        level: 'error',
        tags: { route: 'webhooks/whatsapp', org_id: params.org_id },
        extra: { status: res.status },
      })
    }
  } catch (error) {
    // El bot no respondera este mensaje — critico para el producto, pero no
    // se relanza: el resto del procesamiento (markAsRead) debe continuar.
    log.error('callN8nBot failed', { error, conversation_id: params.conversation_id })
    Sentry.captureException(error, {
      tags: { route: 'webhooks/whatsapp', org_id: params.org_id },
    })
  }
}

async function processWebhook(body: WebhookPayload) {
  const supabase = getServiceClient()
  const entries = body.entry
  if (!entries) return

  for (const entry of entries) {
    const changes = entry.changes
    if (!changes) continue

    for (const change of changes) {
      const value = change.value
      if (!value) continue

      const metadata = value.metadata
      const messages = value.messages
      const contactsPayload = value.contacts

      if (!metadata?.phone_number_id || !messages) continue

      // Find org by phone_number_id
      const { data: waAccount } = await supabase
        .from('whatsapp_accounts')
        .select('org_id, phone_number_id, access_token')
        .eq('phone_number_id', metadata.phone_number_id)
        .single()

      if (!waAccount) {
        baseLog.warn('no WhatsApp account for phone_number_id', {
          phone_number_id: metadata.phone_number_id,
        })
        continue
      }

      const log = baseLog.child({ org_id: waAccount.org_id })

      // Map wa_id -> profile name from the webhook contacts array
      const nameByWaId = new Map<string, string>()
      for (const c of contactsPayload ?? []) {
        if (c.wa_id && c.profile?.name) nameByWaId.set(c.wa_id, c.profile.name.slice(0, 256))
      }

      for (const rawMessage of messages) {
        // Validación por mensaje: uno malformado se saltea sin descartar el
        // resto del batch.
        const parsedMessage = webhookMessageSchema.safeParse(rawMessage)
        if (!parsedMessage.success) {
          log.warn('inbound message failed validation — skipped', {
            issues: parsedMessage.error.issues,
          })
          continue
        }
        const message = parsedMessage.data

        const from = message.from
        const type = message.type
        const messageId = message.id
        const profileName = nameByWaId.get(from) ?? null

        // Idempotencia: Meta reintenta la entrega si no recibe 200 a tiempo.
        // Si ya procesamos este wamid, no reinsertar ni volver a subir media.
        if (messageId) {
          const { data: dupe } = await supabase
            .from('messages')
            .select('id')
            .eq('wa_message_id', messageId)
            .maybeSingle()
          if (dupe) continue
        }

        // Extract text content
        let content = ''
        let mediaPath: string | null = null
        let mediaType: string | null = null
        if (type === 'text') {
          content = message.text?.body ?? ''
        } else if (type === 'interactive') {
          content = message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? `[${type}]`
        } else if (type === 'audio') {
          try {
            const { getMessagingToken } = await import('@/lib/whatsapp/token')
            const tok = getMessagingToken(waAccount)
            const audioId = message.audio?.id
            if (audioId && tok) {
              const mediaRes = await fetch(
                `https://graph.facebook.com/v21.0/${audioId}`,
                { headers: { Authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(10_000) }
              )
              const mediaData = await mediaRes.json() as { url?: string }
              if (mediaData.url) {
                const audioRes = await fetch(mediaData.url, {
                  headers: { Authorization: `Bearer ${tok}` },
                  signal: AbortSignal.timeout(20_000),
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
          } catch (error) {
            // Fallback: el mensaje entra igual como [audio], pero sin log el
            // fallo de transcripcion (token, Whisper, timeout) era invisible.
            log.warn('audio transcription failed', { error, wamid: messageId })
            content = '[audio]'
          }
        } else if (type === 'image') {
          mediaType = 'image'
          content = '[image]'
          try {
            const { getMessagingToken } = await import('@/lib/whatsapp/token')
            const tok = getMessagingToken(waAccount)
            const image = message.image
            const parts: string[] = []
            if (image?.caption) parts.push(image.caption)
            if (image?.id && tok) {
              const { downloadMedia, compressImage, describeImage, storeChatImage } =
                await import('@/lib/whatsapp/media')
              const original = await downloadMedia(image.id, tok)
              if (original) {
                const webp = await compressImage(original)
                mediaPath = await storeChatImage(supabase, waAccount.org_id, webp)
                const description = await describeImage(webp)
                if (description) parts.push(`[Imagen: ${description}]`)
              }
            }
            if (parts.length) content = parts.join(' ')
          } catch (error) {
            log.error('inbound image processing failed', { error, wamid: messageId })
            Sentry.captureException(error, {
              tags: { route: 'webhooks/whatsapp', org_id: waAccount.org_id },
            })
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

        // Insert message. El schema ya capea text.body, pero transcripciones
        // de audio y descripciones de imagen se generan después — capear igual.
        content = content.slice(0, 8192)
        const { error: insertError } = await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'user',
          content,
          from_bot: false,
          media_url: mediaPath,
          media_type: mediaType,
          wa_message_id: messageId ?? null,
        })

        if (insertError) {
          // 23505 = unique violation en wa_message_id: un reintento concurrente
          // ya inserto este mensaje — no llamar al bot de nuevo.
          if (insertError.code !== '23505') {
            // Mensaje del cliente perdido: no queda en el dashboard y el bot
            // no responde — el peor fallo silencioso posible.
            log.error('message insert failed', {
              error: insertError,
              conversation_id: conversation.id,
              wamid: messageId,
            })
            Sentry.captureException(new Error(`message insert failed: ${insertError.message}`), {
              tags: { route: 'webhooks/whatsapp', org_id: waAccount.org_id },
              extra: { code: insertError.code, conversation_id: conversation.id },
            })
          }
          continue
        }

        // Call N8N bot if active and we have processable content.
        // Placeholders tipo [image]/[video]/[sticker] no van al bot — solo
        // texto real (incluye transcripciones de audio y descripciones de imagen).
        const isPlaceholder = /^\[[a-z_]+\]$/.test(content)
        if (conversation.bot_active && content && !isPlaceholder) {
          const { data: org } = await supabase
            .from('organizations')
            .select('prompt')
            .eq('id', waAccount.org_id)
            .single()

          const { getMessagingToken } = await import('@/lib/whatsapp/token')
          const tok = getMessagingToken(waAccount)

          await callN8nBot(
            {
              org_id: waAccount.org_id,
              conversation_id: conversation.id,
              contact_phone: from,
              phone_number_id: metadata.phone_number_id,
              access_token: tok ?? waAccount.access_token,
              message: content,
              system_prompt: org?.prompt ?? '',
              n8n_secret: process.env.N8N_INTERNAL_SECRET ?? '',
              callback_base_url: process.env.TOURGUIDE_API_URL ?? '',
            },
            log
          )
        }

        // Mark as read in WhatsApp
        if (messageId) {
          const { markAsRead } = await import('@/lib/whatsapp/client')
          const { getMessagingToken } = await import('@/lib/whatsapp/token')
          const token = getMessagingToken(waAccount)
          if (token) {
            await markAsRead(metadata.phone_number_id, token, messageId).catch((error) => {
              // No critico (el doble check azul), pero un fallo sostenido
              // delata token vencido — dejar rastro.
              log.warn('markAsRead failed', { error, wamid: messageId })
            })
          }
        }
      }
    }
  }
}
