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

const log = createLogger({ route: 'internal/bot-control' })

// N8N desactiva el bot (handoff a humano). Un 4xx/5xx permite al workflow
// de N8N reintentar o ramificar en fallo.
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.N8N_INTERNAL_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: { conversation_id?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { conversation_id } = body
    if (!conversation_id) {
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('org_id')
      .eq('id', conversation_id)
      .maybeSingle()

    if (convError) {
      log.error('conversation lookup failed', { error: convError, conversation_id })
      Sentry.captureException(new Error(`bot-control lookup failed: ${convError.message}`), {
        tags: { route: 'internal/bot-control' },
        extra: { conversation_id },
      })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }
    if (!conversation) {
      log.warn('conversation not found', { conversation_id })
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ bot_active: false, status: 'pending' })
      .eq('id', conversation_id)

    if (updateError) {
      // Si esto falla el bot sigue respondiendo cuando N8N pidio handoff a
      // humano — el cliente recibe respuestas de bot que nadie pidio.
      log.error('bot deactivate failed', {
        error: updateError,
        org_id: conversation.org_id,
        conversation_id,
      })
      Sentry.captureException(new Error(`bot deactivate failed: ${updateError.message}`), {
        tags: { route: 'internal/bot-control', org_id: conversation.org_id },
        extra: { code: updateError.code, conversation_id },
      })
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error('unexpected failure', { error })
    Sentry.captureException(error, { tags: { route: 'internal/bot-control' } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
