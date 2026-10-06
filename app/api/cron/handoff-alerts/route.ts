import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { createLogger } from '@/lib/logger'
import { appUrl, orgRecipients, sendOnce } from '@/lib/email/notify'
import { box, esc, layout, p } from '@/lib/email/layout'

// Traspaso sin atender (CODE-185). pg_cron la llama cada minuto: busca
// traspasos de hace 5 a 60 min cuya conversacion sigue esperando agente y
// avisa por correo a todo el equipo. Un correo por traspaso (email_log).
const WAIT_MIN = 5
const LOOKBACK_MIN = 60

const log = createLogger({ route: 'cron/handoff-alerts' })

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = Date.now()

  try {
    const { data: events } = await service
      .from('conversation_events')
      .select('id, org_id, conversation_id, created_at')
      .eq('type', 'handoff')
      .lte('created_at', new Date(now - WAIT_MIN * 60_000).toISOString())
      .gte('created_at', new Date(now - LOOKBACK_MIN * 60_000).toISOString())

    let sent = 0
    for (const ev of events ?? []) {
      const { data: conv } = await service
        .from('conversations')
        .select('id, status, assigned_agent_id, contact:contacts(name, phone)')
        .eq('id', ev.conversation_id)
        .maybeSingle()
      // Ya la tomo alguien o se resolvio: no hace falta avisar.
      if (!conv || conv.status !== 'pending' || conv.assigned_agent_id) continue

      const { data: lead } = await service
        .from('leads')
        .select('tour_interest, metadata, next_step')
        .eq('conversation_id', ev.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const contact = conv.contact as unknown as { name: string | null; phone: string } | null
      const name = contact?.name || contact?.phone || 'Un cliente'
      const minutes = Math.round((now - new Date(ev.created_at).getTime()) / 60_000)
      const meta = (lead?.metadata ?? {}) as { group_size?: string; travel_date?: string; quote?: string }
      const details = [lead?.tour_interest, meta.group_size, meta.travel_date].filter(Boolean).map(esc).join(' · ')
      const html = layout({
        title: 'Un cliente quiere atención y nadie lo tomó',
        body:
          p(`El bot pasó esta conversación a tu equipo hace ${minutes} minutos y sigue esperando.`) +
          box(`${esc(name)}${contact?.phone && contact?.name ? ` · ${esc(contact.phone)}` : ''}`, [
            ...(details ? [details] : []),
            ...(meta.quote ? [`Cotizado: ${esc(meta.quote)}`] : []),
            ...(lead?.next_step ? [`Próximo paso: ${esc(lead.next_step)}`] : []),
          ]),
        cta: { label: 'Abrir la conversación', url: `${appUrl()}/conversations/${ev.conversation_id}` },
      })
      const ok = await sendOnce(
        service,
        {
          orgId: ev.org_id,
          kind: 'handoff_unattended',
          dedupeKey: `handoff:${ev.id}`,
          to: await orgRecipients(service, ev.org_id),
          subject: `${name} está esperando hace ${minutes} minutos`,
          html,
        },
        log.child({ org_id: ev.org_id })
      )
      if (ok) sent++
    }
    return NextResponse.json({ ok: true, checked: events?.length ?? 0, sent })
  } catch (error) {
    log.error('handoff alerts failed', { error })
    Sentry.captureException(error, { tags: { route: 'cron/handoff-alerts' } })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
