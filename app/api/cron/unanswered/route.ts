import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { createLogger } from '@/lib/logger'
import { pingHeartbeat } from '@/lib/monitoring/heartbeat'
import { appUrl, orgRecipients, sendOnce } from '@/lib/email/notify'
import { box, esc, layout, p } from '@/lib/email/layout'

// Mensaje del cliente sin respuesta (CODE-177). pg_cron la llama cada minuto.
// Si el bot esta activo y el ultimo mensaje es del cliente hace mas de 2 min,
// algo fallo en el camino (n8n caido, token, OpenAI, un bug): nadie le
// contesto y nadie se entero. La conversacion pasa a un agente, se avisa al
// equipo por correo y a nosotros en Sentry, y queda el evento bot_no_reply.
// No vuelve a saltar para la misma conversacion: el bot queda pausado.
const WAIT_MIN = 2
const LOOKBACK_MIN = 30

// Reacciones y tipos no soportados se guardan como "[reaction]": no van al
// bot porque no piden respuesta (mismo criterio que el webhook).
const isPlaceholder = (content: string) => /^\[[a-z_]+\]$/.test(content)

const log = createLogger({ route: 'cron/unanswered' })

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = Date.now()

  try {
    // last_message_at se mueve con cada mensaje (cliente, bot o agente): si
    // quedo quieto entre 2 y 30 min, el ultimo puede ser uno sin respuesta.
    const { data: convs } = await service
      .from('conversations')
      .select('id, org_id, contact:contacts(name, phone)')
      .eq('bot_active', true)
      .is('deleted_at', null)
      .neq('status', 'resolved')
      .lte('last_message_at', new Date(now - WAIT_MIN * 60_000).toISOString())
      .gte('last_message_at', new Date(now - LOOKBACK_MIN * 60_000).toISOString())

    let flagged = 0
    for (const conv of convs ?? []) {
      const { data: last } = await service
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!last || last.role !== 'user' || isPlaceholder(last.content)) continue
      const minutes = Math.round((now - new Date(last.created_at).getTime()) / 60_000)
      if (minutes < WAIT_MIN) continue

      const orgLog = log.child({ org_id: conv.org_id })

      // Solo si sigue con el bot activo (un agente pudo tomarla recien). El
      // trigger registra el 'handoff'; handoff-alerts lo reconoce por el
      // bot_no_reply de al lado y no manda un segundo correo.
      const { data: paused } = await service
        .from('conversations')
        .update({ bot_active: false, status: 'pending', assigned_agent_id: null })
        .eq('id', conv.id)
        .eq('bot_active', true)
        .select('id')
      if (!paused?.length) continue
      flagged++

      const { error: eventError } = await service
        .from('conversation_events')
        .insert({ conversation_id: conv.id, org_id: conv.org_id, type: 'bot_no_reply' })
      if (eventError) orgLog.error('bot_no_reply event insert failed', { error: eventError, conversation_id: conv.id })

      orgLog.warn('customer message left unanswered by the bot', { conversation_id: conv.id, minutes })
      Sentry.captureMessage('Bot did not reply to a customer message', {
        level: 'warning',
        tags: { route: 'cron/unanswered', org_id: conv.org_id },
        extra: { conversation_id: conv.id, message_id: last.id, minutes },
      })

      const contact = conv.contact as unknown as { name: string | null; phone: string } | null
      const name = contact?.name || contact?.phone || 'Un cliente'
      const excerpt = last.content.length > 240 ? `${last.content.slice(0, 240)}…` : last.content
      const html = layout({
        title: 'El bot no pudo responder a un cliente',
        body:
          p(`${esc(name)} escribió hace ${minutes} minutos y no recibió respuesta. Pasamos la conversación a tu equipo para que nadie se quede esperando.`) +
          box(`${esc(name)}${contact?.phone && contact?.name ? ` · ${esc(contact.phone)}` : ''}`, [`“${esc(excerpt)}”`]) +
          p('Ya estamos revisando qué pasó con el bot. Mientras tanto, respóndele desde el panel.'),
        cta: { label: 'Responder ahora', url: `${appUrl()}/conversations/${conv.id}` },
      })
      await sendOnce(
        service,
        {
          orgId: conv.org_id,
          kind: 'bot_no_reply',
          dedupeKey: `no_reply:${last.id}`,
          to: await orgRecipients(service, conv.org_id),
          subject: `${name} no recibió respuesta del bot`,
          html,
        },
        orgLog
      )
    }
    // Corre cada minuto por pg_cron: su ping prueba toda la cadena (pg_cron →
    // pg_net → Vault → app). Si se corta, tambien se cortan handoff-alerts.
    await pingHeartbeat('BETTERSTACK_HEARTBEAT_PG_CRON', log)
    return NextResponse.json({ ok: true, checked: convs?.length ?? 0, flagged })
  } catch (error) {
    log.error('unanswered check failed', { error })
    Sentry.captureException(error, { tags: { route: 'cron/unanswered' } })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
