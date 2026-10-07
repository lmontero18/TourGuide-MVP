import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { createLogger } from '@/lib/logger'
import { appUrl, orgRecipients, sendOnce } from '@/lib/email/notify'
import { box, esc, kpis, layout, p } from '@/lib/email/layout'

// Resumen diario por correo. pg_cron la llama cada hora; se manda a las
// agencias donde son las 8:00 (su zona horaria) con lo que paso ayer. Para
// probar: ?org=<id>&force=1 (con el mismo CRON_SECRET).
const SEND_HOUR = 8
const log = createLogger({ route: 'cron/daily-summary' })

function tzParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const v = (k: string) => Number(parts.find((x) => x.type === k)?.value)
  return { y: v('year'), m: v('month'), d: v('day'), h: v('hour'), min: v('minute'), s: v('second') }
}

// Medianoche (en UTC) del dia local y,m,d de la zona tz.
function localMidnight(y: number, m: number, d: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d)
  const p2 = tzParts(new Date(guess), tz)
  const offset = Date.UTC(p2.y, p2.m - 1, p2.d, p2.h, p2.min, p2.s) - guess
  return new Date(guess - offset)
}

async function summarize(service: SupabaseClient, org: { id: string; name: string; tz: string }, force: boolean) {
  const now = tzParts(new Date(), org.tz)
  if (!force && now.h !== SEND_HOUR) return false
  const todayStart = localMidnight(now.y, now.m, now.d, org.tz)
  const yStart = new Date(todayStart.getTime() - 86_400_000)
  const from = yStart.toISOString()
  const to = todayStart.toISOString()
  const dayLabel = new Intl.DateTimeFormat('es', { timeZone: org.tz, weekday: 'long', day: 'numeric', month: 'long' }).format(yStart)

  const { data: msgs } = await service
    .from('messages')
    .select('role, conversation_id, created_at, conversations!inner(org_id)')
    .eq('conversations.org_id', org.id)
    .gte('created_at', from)
    .lt('created_at', to)
    .limit(20000)
  const rows = (msgs ?? []) as { role: string; conversation_id: string; created_at: string }[]
  const convs = new Set(rows.filter((r) => r.role === 'user').map((r) => r.conversation_id))
  if (convs.size === 0) return false

  const night = new Set(
    rows
      .filter((r) => r.role === 'user')
      .filter((r) => {
        const h = tzParts(new Date(r.created_at), org.tz).h
        return h >= 20 || h < 8
      })
      .map((r) => r.conversation_id)
  )
  const bot = rows.filter((r) => r.role === 'assistant').length
  const agent = rows.filter((r) => r.role === 'agent').length
  const botShare = bot + agent ? Math.round((bot / (bot + agent)) * 100) : 0

  const [{ data: ready }, { data: won }] = await Promise.all([
    service.from('leads').select('contact:contacts(name, phone)').eq('org_id', org.id).eq('status', 'qualified').limit(20),
    service.from('leads').select('amount, currency').eq('org_id', org.id).eq('status', 'converted').gte('closed_at', from).lt('closed_at', to),
  ])
  const readyNames = ((ready ?? []) as unknown as { contact: { name: string | null; phone: string } | null }[]).map(
    (l) => l.contact?.name || l.contact?.phone || 'Cliente'
  )
  const wonRows = (won ?? []) as { amount: number | null; currency: string | null }[]
  const revenue = wonRows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const currency = wonRows.find((r) => r.currency)?.currency ?? 'USD'
  const money = new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 0 }).format(revenue)

  const html = layout({
    title: `Así fue tu ${esc(dayLabel)}`,
    body:
      kpis([
        { value: String(convs.size), label: 'conversaciones' },
        { value: String(night.size), label: 'de noche' },
        { value: String(readyNames.length), label: 'listos para cerrar' },
        { value: money, label: 'reservado' },
      ]) +
      p(
        `El bot dio el ${botShare}% de las respuestas.` +
          (night.size ? ` ${night.size} ${night.size === 1 ? 'consulta llegó' : 'consultas llegaron'} de noche (20:00–8:00) y el bot las atendió.` : '')
      ) +
      (readyNames.length
        ? box('Para hoy', [`${readyNames.length} ${readyNames.length === 1 ? 'cliente listo' : 'clientes listos'} para cerrar: ${readyNames.slice(0, 5).map(esc).join(', ')}${readyNames.length > 5 ? '…' : ''}`])
        : ''),
    cta: { label: 'Ver los leads', url: `${appUrl()}/leads` },
    footer: 'Recibes este resumen porque eres administrador de tu agencia en Tourfy. Puedes apagarlo en Configuración.',
  })

  const yKey = `${tzParts(yStart, org.tz).y}-${String(tzParts(yStart, org.tz).m).padStart(2, '0')}-${String(tzParts(yStart, org.tz).d).padStart(2, '0')}`
  return sendOnce(
    service,
    {
      orgId: org.id,
      kind: 'daily_summary',
      dedupeKey: `summary:${org.id}:${yKey}${force ? `:test:${Date.now()}` : ''}`,
      to: await orgRecipients(service, org.id, { adminsOnly: true, onlySummary: true }),
      subject: `Ayer en ${org.name}: ${convs.size} ${convs.size === 1 ? 'conversación' : 'conversaciones'}${wonRows.length ? ` y ${wonRows.length} ${wonRows.length === 1 ? 'reserva' : 'reservas'} por ${money}` : ''}`,
      html,
    },
    log.child({ org_id: org.id })
  )
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const onlyOrg = request.nextUrl.searchParams.get('org')
  const force = request.nextUrl.searchParams.get('force') === '1' && !!onlyOrg

  try {
    let query = service.from('organizations').select('id, name, bot_config').not('onboarded_at', 'is', null)
    if (onlyOrg) query = query.eq('id', onlyOrg)
    const { data: orgs } = await query
    let sent = 0
    for (const o of orgs ?? []) {
      const tz = (o.bot_config as { timezone?: string } | null)?.timezone || 'America/Managua'
      try {
        if (await summarize(service, { id: o.id, name: o.name, tz }, force)) sent++
      } catch (error) {
        log.error('summary failed for org', { error, org_id: o.id })
        Sentry.captureException(error, { tags: { route: 'cron/daily-summary', org_id: o.id } })
      }
    }
    return NextResponse.json({ ok: true, orgs: orgs?.length ?? 0, sent })
  } catch (error) {
    log.error('daily summary failed', { error })
    Sentry.captureException(error, { tags: { route: 'cron/daily-summary' } })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
