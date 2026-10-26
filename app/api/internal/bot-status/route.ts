import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { safeEqual } from '@/lib/security'
import { checkRateLimit } from '@/lib/ratelimit'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const log = createLogger({ route: 'internal/bot-status' })

const bodySchema = z.object({
  conversation_id: z.string().uuid(),
})

// N8N pregunta si el bot sigue a cargo justo antes de responder. El webhook
// solo le pasa mensajes con bot_active=true, pero entre que llega el mensaje y
// el bot responde pasan 15-40 segundos (buffer + modelo). Si en ese rato otra
// ejecucion paso la conversacion a un humano, o un agente la tomo, el bot no
// debe contestar. Visto en prod: el cliente mando un mensaje 2 segundos antes
// del traspaso y recibio dos "te paso con el equipo" seguidos.
export async function POST(request: NextRequest) {
  const secret = process.env.N8N_INTERNAL_SECRET
  if (!secret) {
    log.error('N8N_INTERNAL_SECRET not configured')
    Sentry.captureMessage('N8N_INTERNAL_SECRET missing', {
      level: 'fatal',
      tags: { route: 'internal/bot-status' },
    })
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (!auth || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await checkRateLimit('internal', 'bot-status'))) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    const result = bodySchema.safeParse(await request.json())
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    parsed = result.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const { data: conversation, error } = await getServiceClient()
      .from('conversations')
      .select('bot_active')
      .eq('id', parsed.conversation_id)
      .maybeSingle()

    if (error) throw error
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json({ bot_active: conversation.bot_active })
  } catch (error) {
    // N8N trata el fallo como "seguir respondiendo": es mejor una respuesta
    // de mas que un cliente sin respuesta.
    log.error('bot status lookup failed', { error, conversation_id: parsed.conversation_id })
    Sentry.captureException(error, { tags: { route: 'internal/bot-status' } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
