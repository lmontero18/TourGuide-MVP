import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { createLogger } from '@/lib/logger'
import { pingHeartbeat } from '@/lib/monitoring/heartbeat'
import { parseReaction } from '@/lib/whatsapp/placeholders'

// Auto-resolver conversaciones inactivas (CODE-162, Vercel Cron diario, ver
// vercel.json). Pasa a `resolved` las conversaciones ABIERTAS sin mensajes en
// INACTIVE_DAYS. Si el cliente vuelve a escribir, el webhook la reabre.
//
// `pending` (esperando agente) queda afuera a proposito: resolverla sola
// esconderia a un cliente que pidio hablar con una persona y nadie atendio.
// Por lo mismo tampoco se resuelve una conversacion que un agente tomo
// (bot pausado) si el ultimo mensaje es del cliente: queda esperando respuesta
// en la bandeja hasta que alguien le conteste o la resuelva a mano.
const INACTIVE_DAYS = 3
// Mensajes recientes que se miran para encontrar el ultimo que no sea una
// reaccion (un 👍 del cliente no pide respuesta).
const LAST_MESSAGES = 10

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

  const service = getServiceClient()
  const { data: candidates, error: selectError } = await service
    .from('conversations')
    .select('id, bot_active')
    .eq('status', 'open')
    .lt('last_message_at', cutoff)

  if (selectError) return fail(selectError.message)

  const ids: string[] = []
  let skipped = 0
  for (const conv of candidates ?? []) {
    if (!conv.bot_active && (await customerWaiting(service, conv.id))) {
      skipped++
      continue
    }
    ids.push(conv.id)
  }

  // Mismo estado que "Resolver" a mano: bot activo y sin agente, para que si
  // el cliente vuelve, el bot conteste. Los filtros se repiten por si entro un
  // mensaje o un agente la movio mientras tanto.
  const { data, error } = ids.length
    ? await service
        .from('conversations')
        .update({ status: 'resolved', bot_active: true, assigned_agent_id: null })
        .in('id', ids)
        .eq('status', 'open')
        .lt('last_message_at', cutoff)
        .select('id')
    : { data: [], error: null }

  if (error) return fail(error.message)

  const resolved = data?.length ?? 0
  log.info('auto-resolve done', { resolved, skipped })
  await pingHeartbeat('BETTERSTACK_HEARTBEAT_AUTO_RESOLVE', log)
  return NextResponse.json({ resolved, skipped })
}

// true si el ultimo mensaje que no es reaccion es del cliente.
async function customerWaiting(service: ReturnType<typeof getServiceClient>, conversationId: string) {
  const { data, error } = await service
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(LAST_MESSAGES)
  // Ante la duda no se resuelve: mejor una conversacion de mas en la bandeja
  // que un cliente escondido.
  if (error) return true
  const last = data?.find(m => !parseReaction(m.content))
  return last?.role === 'user'
}

function fail(message: string) {
  log.error('auto-resolve failed', { error: message })
  Sentry.captureException(new Error(`auto-resolve failed: ${message}`), {
    tags: { route: 'cron/auto-resolve' },
  })
  return NextResponse.json({ error: message }, { status: 500 })
}
