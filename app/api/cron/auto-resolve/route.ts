import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { createLogger } from '@/lib/logger'

// Auto-resolver conversaciones inactivas (CODE-162, Vercel Cron diario, ver
// vercel.json). Pasa a `resolved` las conversaciones ABIERTAS sin mensajes en
// INACTIVE_DAYS. Si el cliente vuelve a escribir, el webhook la reabre.
//
// `pending` (esperando agente) queda afuera a proposito: resolverla sola
// esconderia a un cliente que pidio hablar con una persona y nadie atendio.
const INACTIVE_DAYS = 3

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const log = createLogger({ route: 'cron/auto-resolve' })

export async function GET(request: NextRequest) {
  // Vercel Cron manda Authorization: Bearer ${CRON_SECRET}
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Mismo estado que "Resolver" a mano: bot activo y sin agente, para que si
  // el cliente vuelve, el bot conteste.
  const { data, error } = await getServiceClient()
    .from('conversations')
    .update({ status: 'resolved', bot_active: true, assigned_agent_id: null })
    .eq('status', 'open')
    .lt('last_message_at', cutoff)
    .select('id')

  if (error) {
    log.error('auto-resolve failed', { error })
    Sentry.captureException(new Error(`auto-resolve failed: ${error.message}`), {
      tags: { route: 'cron/auto-resolve' },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resolved = data?.length ?? 0
  log.info('auto-resolve done', { resolved })
  return NextResponse.json({ resolved })
}
