import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { PAYMENT_ERROR_CODE, clearPaymentFailed, markPaymentFailed } from '@/lib/whatsapp/billing'
import { ensureOpenLead, refreshLead } from '@/lib/leads/sync'
import { applyDeliveryStatus } from '@/lib/whatsapp/delivery'
import { notifyTemplateStatus } from '@/lib/whatsapp/templateStatus'
import { detectAbuse, type AbuseReason } from '@/lib/bot/abuse'

// ~10 min de nota de voz en opus. Mas largo no se manda a Whisper (costo).
const MAX_AUDIO_BYTES = 2.5 * 1024 * 1024
import { verifyWebhookSignature } from '@/lib/whatsapp/verify'
import {
  webhookPayloadSchema,
  webhookMessageSchema,
  type WebhookPayload,
} from '@/lib/whatsapp/schemas'
import { checkRateLimit } from '@/lib/ratelimit'
import { createLogger, type Logger } from '@/lib/logger'
import { DEFAULT_TIMEZONE } from '@/lib/bot/businessHours'
import type { BotConfig } from '@/types'

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
    const results = await Promise.all(
      phoneNumberIds.map(async (id) => ({ id, allowed: await checkRateLimit('webhook', id) }))
    )
    const blocked = new Set(results.filter((r) => !r.allowed).map((r) => r.id))
    if (blocked.size > 0) {
      baseLog.warn('webhook rate limited', { phone_number_ids: [...blocked] })
      Sentry.captureMessage('webhook rate limited', {
        level: 'warning',
        tags: { route: 'webhooks/whatsapp' },
        extra: { phone_number_ids: [...blocked] },
      })
      if (blocked.size === phoneNumberIds.length) {
        return NextResponse.json({ status: 'rate_limited' }, { status: 200 })
      }
      // Batch mixto (raro — Meta suele mandar un solo número por webhook):
      // se descartan solo los changes del número bloqueado, el resto sigue.
      body = {
        ...body,
        entry: (body.entry ?? []).map((entry) => ({
          ...entry,
          changes: (entry.changes ?? []).filter(
            (change) => !blocked.has(change.value?.metadata?.phone_number_id ?? '')
          ),
        })),
      }
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
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET ?? '',
      },
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

      // Meta aprobo o rechazo una plantilla (campo del webhook
      // message_template_status_update, hay que suscribirlo en la app de Meta).
      if (change.field === 'message_template_status_update') {
        await notifyTemplateStatus(supabase, {
          wabaId: entry.id,
          event: value.event,
          name: value.message_template_name,
          language: value.message_template_language,
          templateId: value.message_template_id,
          reason: value.reason,
        }, baseLog).catch((error) => baseLog.warn('template status notify failed', { error }))
        continue
      }

      const metadata = value.metadata
      const messages = value.messages
      const contactsPayload = value.contacts

      // El bot envia desde n8n directo a Meta: un rechazo por falta de pago
      // solo nos llega como status 'failed' 131042 en este webhook.
      const paymentFailed = value.statuses?.some(
        (s) => s.status === 'failed' && s.errors?.some((e) => e.code === PAYMENT_ERROR_CODE)
      )
      if (metadata?.phone_number_id && paymentFailed) {
        await markPaymentFailed(supabase, { phoneNumberId: metadata.phone_number_id }, baseLog)
      }
      // Estado de entrega de cada mensaje que enviamos (enviado, entregado,
      // leido o fallido con su codigo): se ve en la burbuja del chat.
      for (const status of value.statuses ?? []) {
        await applyDeliveryStatus(supabase, status, baseLog)
      }
      const billableDelivered = value.statuses?.some(
        (s) => (s.status === 'delivered' || s.status === 'read') && s.pricing?.billable === true
      )
      if (metadata?.phone_number_id && billableDelivered && !paymentFailed) {
        await clearPaymentFailed(supabase, metadata.phone_number_id)
      }

      if (!metadata?.phone_number_id || !messages) continue

      // Find org by phone_number_id
      const { data: waAccount } = await supabase
        .from('whatsapp_accounts')
        .select('org_id, phone_number_id')
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
        // Tipo de medio que el bot no puede ver completo: agrega una guia al
        // system prompt para que responda con naturalidad (ver abajo).
        let mediaNote: string | null = null
        if (type === 'text') {
          content = message.text?.body ?? ''
        } else if (type === 'interactive') {
          content = message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? `[${type}]`
        } else if (type === 'audio') {
          try {
            const { getMessagingToken } = await import('@/lib/whatsapp/token')
            const tok = getMessagingToken()
            const audioId = message.audio?.id
            if (audioId && tok) {
              const mediaRes = await fetch(
                `https://graph.facebook.com/v21.0/${audioId}`,
                { headers: { Authorization: `Bearer ${tok}`, 'User-Agent': 'Tourfy/1.0 (+https://www.tourfy.app)' }, signal: AbortSignal.timeout(10_000) }
              )
              const mediaData = await mediaRes.json() as { url?: string }
              if (mediaData.url) {
                const audioRes = await fetch(mediaData.url, {
                  headers: { Authorization: `Bearer ${tok}`, 'User-Agent': 'Tourfy/1.0 (+https://www.tourfy.app)' },
                  signal: AbortSignal.timeout(20_000),
                })
                const audioBuffer = await audioRes.arrayBuffer()
                // Tope de costo: una nota de voz de >~10 min (opus ~240 KB/min)
                // no se transcribe; entra como [Audio largo] y el bot pide que
                // lo resuma por escrito o pasa a un agente.
                if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
                  log.info('audio too long, skipped transcription', { bytes: audioBuffer.byteLength, wamid: messageId })
                  content = '[Audio largo]'
                  mediaNote = 'una nota de voz muy larga que no se puede escuchar'
                } else {
                  const { OpenAI } = await import('openai')
                  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
                  const transcript = await openai.audio.transcriptions.create({
                    file: new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' }),
                    model: 'whisper-1',
                  })
                  content = transcript.text
                }
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
          // "[Imagen]" (mayuscula) SI va al bot: si el procesamiento falla, el
          // bot igual responde en vez de quedarse callado (antes "[image]").
          content = '[Imagen]'
          mediaNote = 'una imagen'
          const image = message.image
          const parts: string[] = []
          if (image?.caption) parts.push(image.caption)
          try {
            const { getMessagingToken } = await import('@/lib/whatsapp/token')
            const tok = getMessagingToken()
            if (image?.id && tok) {
              const { downloadMedia, compressImage, describeImage, storeChatImage } =
                await import('@/lib/whatsapp/media')
              const original = await downloadMedia(image.id, tok)
              if (original) {
                const webp = await compressImage(original)
                mediaPath = await storeChatImage(supabase, waAccount.org_id, webp)
                const description = await describeImage(webp)
                parts.push(description ? `[Imagen: ${description}]` : '[Imagen]')
              } else {
                Sentry.captureMessage('inbound image download failed', {
                  level: 'error',
                  tags: { route: 'webhooks/whatsapp', org_id: waAccount.org_id },
                })
              }
            }
          } catch (error) {
            log.error('inbound image processing failed', { error, wamid: messageId })
            Sentry.captureException(error, {
              tags: { route: 'webhooks/whatsapp', org_id: waAccount.org_id },
            })
          }
          if (!parts.some((p) => p.startsWith('[Imagen'))) parts.push('[Imagen]')
          content = parts.join(' ')
        } else if (type === 'sticker') {
          // Un sticker es una imagen webp: se describe con el mismo camino que
          // las imagenes para que el bot pueda reaccionar ("[Sticker: pulgar
          // arriba]") en vez de quedarse callado.
          mediaType = 'image'
          content = '[Sticker]'
          mediaNote = 'un sticker'
          try {
            const { getMessagingToken } = await import('@/lib/whatsapp/token')
            const tok = getMessagingToken()
            const stickerId = message.sticker?.id
            if (stickerId && tok) {
              const { downloadMedia, compressImage, describeImage, storeChatImage } =
                await import('@/lib/whatsapp/media')
              const original = await downloadMedia(stickerId, tok)
              if (original) {
                const webp = await compressImage(original)
                mediaPath = await storeChatImage(supabase, waAccount.org_id, webp)
                const description = await describeImage(webp)
                if (description) content = `[Sticker: ${description}]`
              }
            }
          } catch (error) {
            log.warn('inbound sticker processing failed', { error, wamid: messageId })
          }
        } else if (type === 'location') {
          const loc = message.location
          const place = [loc?.name, loc?.address].filter(Boolean).join(', ')
          const coords =
            loc?.latitude !== undefined && loc?.longitude !== undefined ? `${loc.latitude}, ${loc.longitude}` : ''
          content = `[Ubicación: ${place || coords || 'sin detalle'}]`
          mediaNote = 'una ubicación'
        } else if (type === 'video') {
          const caption = message.video?.caption?.trim()
          content = caption ? `[Video] ${caption}` : '[Video]'
          mediaNote = 'un video'
        } else if (type === 'document') {
          const doc = message.document
          const caption = doc?.caption?.trim()
          content = `[Documento: ${doc?.filename ?? 'archivo'}]${caption ? ` ${caption}` : ''}`
          mediaNote = 'un documento'
        } else if (type === 'contacts') {
          const names = (message.contacts ?? []).map((c) => c.name?.formatted_name).filter(Boolean)
          content = `[Contacto compartido: ${names.join(', ') || 'sin nombre'}]`
          mediaNote = 'un contacto'
        } else {
          // reaction, unsupported, etc.: placeholder en minuscula, no va al bot
          // (una reaccion con emoji no pide respuesta).
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

        // Una conversacion por contacto (CODE-162). Si esta resuelta y el
        // cliente vuelve a escribir, se REABRE la misma con el bot activo en
        // vez de crear otra: mantiene el historial en un hilo, el bot tiene el
        // contexto anterior y las metricas no ven contactos duplicados.
        let { data: conversation } = await supabase
          .from('conversations')
          .select('id, bot_active, status, deleted_at')
          .eq('org_id', waAccount.org_id)
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const nowTs = new Date().toISOString()
        if (!conversation) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              org_id: waAccount.org_id,
              contact_id: contact.id,
              status: 'open',
              bot_active: true,
              last_message_at: nowTs,
            })
            .select('id, bot_active, status, deleted_at')
            .single()

          conversation = newConv
        } else if (conversation.status === 'resolved' || conversation.deleted_at) {
          // Resuelta o eliminada (borrado logico): el cliente volvio, se
          // reabre la misma y vuelve a aparecer en el inbox.
          const { data: reopened } = await supabase
            .from('conversations')
            .update({ status: 'open', bot_active: true, assigned_agent_id: null, deleted_at: null, last_message_at: nowTs })
            .eq('id', conversation.id)
            .select('id, bot_active, status, deleted_at')
            .single()

          conversation = reopened ?? conversation
        } else {
          // open / pending: el estado no cambia. Una conversacion "esperando
          // agente" sigue esperando aunque el cliente insista.
          await supabase
            .from('conversations')
            .update({ last_message_at: nowTs })
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

        // Panel de leads: la tarjeta aparece con el primer mensaje. Con el bot
        // activo la ficha se llena al guardar su respuesta (save-bot-reply);
        // con un agente a cargo, se actualiza aca (con throttle).
        try {
          await ensureOpenLead(supabase, { id: conversation.id, org_id: waAccount.org_id, contact_id: contact.id })
          if (!conversation.bot_active) await refreshLead(supabase, conversation.id)
        } catch (error) {
          log.warn('lead sync failed', { error, conversation_id: conversation.id })
        }

        // Call N8N bot if active and we have processable content.
        // Placeholders tipo [image]/[video]/[sticker] no van al bot — solo
        // texto real (incluye transcripciones de audio y descripciones de imagen).
        const isPlaceholder = /^\[[a-z_]+\]$/.test(content)
        // Frenos de abuso (troll o bucle contra otro bot): en vez de seguir
        // respondiendo, la conversacion pasa a un agente. Nunca corta a un
        // cliente real: los limites estan muy por encima de una charla normal.
        let brake: AbuseReason | null = null
        if (conversation.bot_active && content && !isPlaceholder) {
          brake = await detectAbuse(supabase, conversation.id).catch(() => null)
          if (brake) {
            await supabase
              .from('conversations')
              .update({ bot_active: false, status: 'pending', assigned_agent_id: null })
              .eq('id', conversation.id)
            log.warn('bot paused by abuse brake', { reason: brake, conversation_id: conversation.id })
            Sentry.captureMessage(`Abuse brake: ${brake}`, {
              level: 'warning',
              tags: { route: 'webhooks/whatsapp', org_id: waAccount.org_id, reason: brake },
              extra: { conversation_id: conversation.id },
            })
          }
        }

        if (conversation.bot_active && content && !isPlaceholder && !brake) {
          const { data: org } = await supabase
            .from('organizations')
            .select('prompt, bot_config')
            .eq('id', waAccount.org_id)
            .single()

          const { getMessagingToken } = await import('@/lib/whatsapp/token')
          const tok = getMessagingToken()

          // Desde CODE-151 el token central es la UNICA fuente (ya no hay fallback
          // a whatsapp_accounts.access_token). Si falta el env var, n8n recibe un
          // Bearer vacio y Graph responde 401: el bot deja de contestar sin que
          // nada mas lo delate. Que sea ruidoso.
          if (!tok) {
            log.error('META_SYSTEM_USER_TOKEN not configured — el bot no puede responder')
            Sentry.captureMessage('META_SYSTEM_USER_TOKEN missing', {
              level: 'fatal',
              tags: { route: 'webhooks/whatsapp', org_id: waAccount.org_id },
            })
          }

          // Hora actual en la timezone de la org: se pega al system_prompt
          // por-request (no se persiste) para que el bot pueda informar
          // cuando derive a un humano — ver lib/bot/compilePrompt.ts.
          // timezone es user-configurable y no se valida contra IANA en el
          // schema del API — un valor invalido no debe tumbar la respuesta
          // del bot, solo perder el contexto de hora (fallback al default).
          const orgTimezone = (org?.bot_config as BotConfig | null)?.timezone || DEFAULT_TIMEZONE
          let nowFormatted: string
          try {
            nowFormatted = new Intl.DateTimeFormat('es', {
              weekday: 'long',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: orgTimezone,
            }).format(new Date())
          } catch (error) {
            log.warn('invalid bot_config.timezone, falling back to default', {
              timezone: orgTimezone,
              error,
            })
            nowFormatted = new Intl.DateTimeFormat('es', {
              weekday: 'long',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: DEFAULT_TIMEZONE,
            }).format(new Date())
          }
          // El recordatorio de idioma va al final a proposito: es lo ultimo que
          // lee el modelo y el prompt entero esta en español (gpt-5-mini mezclaba).
          const systemPrompt =
            `${org?.prompt ?? ''}\n\n` +
            `Fecha y hora actual (zona horaria de la agencia): ${nowFormatted}.\n` +
            `Recordatorio: responde todo el mensaje en el idioma del ultimo mensaje del cliente, sin mezclar idiomas.` +
            // Medios (CODE-177): el bot recibe una nota entre corchetes. Que
            // responda como una persona; transferir solo si hace falta.
            (mediaNote
              ? `\nEl ultimo mensaje del cliente no es texto: es ${mediaNote} (lo ves como una nota entre corchetes). ` +
                `Responde como una persona del equipo de la agencia de tours: reacciona en UNA frase corta a lo que haya ` +
                `(a un sticker, con calidez; a una ubicacion, confirmando que la recibiste y relacionandola con los tours si aplica; ` +
                `si es un video o un documento que no puedes abrir, dilo con sencillez y pidele que te cuente por escrito que necesita) ` +
                `y vuelve enseguida a su viaje: pregunta que planes tiene o como lo ayudas con los tours. ` +
                // Visto en prod: ante la foto de un libro respondio "¿Que queres que haga con la imagen?".
                // Pedido de producto: si no tiene que ver con los tours ni con la
                // conversacion, no comentar el contenido; ofrecer ayuda con los
                // tours o pasarlo con alguien del equipo.
                `Si no tiene nada que ver con los tours ni con la conversacion, NO comentes ni describas lo que hay: ` +
                `pregunta si lo puedes ayudar con algo de los tours y ofrece pasarlo con alguien del equipo si es otra cosa ` +
                `(por ejemplo: "¿Te puedo ayudar con algo de los tours? Si es otra cosa, te paso con alguien del equipo para que te ayude."). ` +
                `Si responde que es otra cosa o insiste, usa transfer_to_human. ` +
                `No transfieras a un agente solo por esto: usa transfer_to_human ` +
                `si el cliente insiste en que alguien revise ese contenido o si lo que necesita requiere a una persona. ` +
                `Si es una imagen sin descripcion, di que no la ves bien y pregunta que te quiere mostrar. ` +
                // Pagos: una foto de un comprobante se falsifica facil. Solo el
                // equipo, mirando la cuenta, puede confirmar que el dinero llego.
                `IMPORTANTE: si parece un comprobante de pago, transferencia o deposito A LA AGENCIA (para una reserva o un tour), ` +
                `NUNCA confirmes que el pago llego ni des la reserva por confirmada. Agradece, di que el equipo va a verificar el pago ` +
                `y te confirma, y usa transfer_to_human. ` +
                // Visto en prod: un cobro de Uber se trato como pago a la agencia.
                `Si es un comprobante de otro comercio (Uber, un supermercado, un restaurante...), NO es un pago a la agencia: ` +
                `tratalo como algo que no tiene que ver con los tours. Nunca cambies la moneda de un monto (₡ no es $).`
              : '')

          await callN8nBot(
            {
              org_id: waAccount.org_id,
              conversation_id: conversation.id,
              contact_phone: from,
              phone_number_id: metadata.phone_number_id,
              access_token: tok,
              message: content,
              system_prompt: systemPrompt,
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
          const token = getMessagingToken()
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
