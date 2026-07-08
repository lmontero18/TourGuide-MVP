import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { createLogger } from '@/lib/logger'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const log = createLogger({ route: 'internal/save-bot-reply' })

// N8N guarda la respuesta del bot. A diferencia del webhook de Meta, aqui un
// 4xx/5xx es util: el workflow de N8N puede reintentar o ramificar en fallo.
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.N8N_INTERNAL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: { conversation_id?: string; content?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { conversation_id, content } = body
    if (!conversation_id || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Resuelve org_id: contexto para logs y validacion de que la conversacion
    // existe (antes se respondia ok:true aunque el insert fallara en silencio).
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('org_id')
      .eq('id', conversation_id)
      .maybeSingle()

    if (convError) {
      log.error('conversation lookup failed', { error: convError, conversation_id })
      Sentry.captureException(new Error(`save-bot-reply lookup failed: ${convError.message}`), {
        tags: { route: 'internal/save-bot-reply' },
        extra: { conversation_id },
      })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }
    if (!conversation) {
      log.warn('conversation not found', { conversation_id })
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const orgLog = log.child({ org_id: conversation.org_id, conversation_id })

    const { error: insertError } = await supabase.from('messages').insert({
      conversation_id,
      role: 'assistant',
      content,
      from_bot: true,
    })

    if (insertError) {
      // Respuesta del bot perdida: el cliente final no la recibe en el
      // dashboard y nadie se entera — reportar y devolver 500 a N8N.
      orgLog.error('bot reply insert failed', { error: insertError })
      Sentry.captureException(new Error(`bot reply insert failed: ${insertError.message}`), {
        tags: { route: 'internal/save-bot-reply', org_id: conversation.org_id },
        extra: { code: insertError.code, conversation_id },
      })
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation_id)

    if (updateError) {
      // El mensaje ya quedo guardado — no fallar la request por el timestamp,
      // pero dejar rastro (afecta el orden de la lista de conversaciones).
      orgLog.warn('last_message_at update failed', { error: updateError })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('unexpected failure', { error })
    Sentry.captureException(error, { tags: { route: 'internal/save-bot-reply' } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
