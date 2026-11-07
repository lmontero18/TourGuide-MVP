import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { createLogger } from '@/lib/logger'
import { appUrl, orgRecipients, sendOnce } from '@/lib/email/notify'
import { esc, kpis, layout, p } from '@/lib/email/layout'
import { localMidnight, tzParts } from '@/lib/time/tz'
import { hasProFeature, type OrgFeatureFlags } from '@/lib/features'

// Resumen mensual por correo (CODE-206, solo Pro). pg_cron la llama cada hora;
// se manda el dia 1 a las 8:00 en la zona horaria de la agencia, con el mes
// que termino: leads calificados, ventas y actividad del bot. Lo reciben los
// admins que no apagaron los resumenes. Para probar: ?org=<id>&force=1 (con
// el mismo CRON_SECRET) manda el del mes pasado aunque no sea dia 1.
const SEND_HOUR = 8
const log = createLogger({ route: 'cron/monthly-summary' })

function money(amounts: Map<string, number>) {
  if (!amounts.size) return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(0)
  return [...amounts.entries()]
    .map(([currency, total]) => new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 0 }).format(total))
    .join(' + ')
}

async function summarize(service: SupabaseClient, org: { id: string; name: string; tz: string }, force: boolean) {
  const now = tzParts(new Date(), org.tz)
  if (!force && (now.d !== 1 || now.h !== SEND_HOUR)) return false
  // Mes que termino: del 1 del mes pasado al 1 de este, en hora local.
  const prevY = now.m === 1 ? now.y - 1 : now.y
  const prevM = now.m === 1 ? 12 : now.m - 1
  const fromDate = localMidnight(prevY, prevM, 1, org.tz)
  const toDate = localMidnight(now.y, now.m, 1, org.tz)
  const from = fromDate.toISOString()
  const to = toDate.toISOString()
  const monthKey = `${prevY}-${String(prevM).padStart(2, '0')}`
  const monthLabel = new Intl.DateTimeFormat('es', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(prevY, prevM - 1, 15)))

  const count = (role: string) =>
    service
      .from('messages')
      .select('id, conversations!inner(org_id)', { count: 'exact', head: true })
      .eq('conversations.org_id', org.id)
      .eq('role', role)
      .gte('created_at', from)
      .lt('created_at', to)

  const [{ data: userMsgs }, { count: bot }, { count: agent }, { data: created }, { data: won }] = await Promise.all([
    service
      .from('messages')
      .select('conversation_id, conversations!inner(org_id)')
      .eq('conversations.org_id', org.id)
      .eq('role', 'user')
      .gte('created_at', from)
      .lt('created_at', to)
      .limit(50000),
    count('assistant'),
    count('agent'),
    service.from('leads').select('status').eq('org_id', org.id).gte('created_at', from).lt('created_at', to).limit(20000),
    service.from('leads').select('amount, currency').eq('org_id', org.id).eq('status', 'converted').gte('closed_at', from).lt('closed_at', to).limit(20000),
  ])

  const conversations = new Set(((userMsgs ?? []) as { conversation_id: string }[]).map((r) => r.conversation_id)).size
  if (conversations === 0) return false

  const leads = (created ?? []) as { status: string }[]
  // Calificados = los que llegaron a "Listo para cerrar" o ya reservaron.
  const qualified = leads.filter((l) => l.status === 'qualified' || l.status === 'converted').length
  const sales = (won ?? []) as { amount: number | null; currency: string | null }[]
  const revenue = new Map<string, number>()
  for (const s of sales) if (s.amount != null) revenue.set(s.currency ?? 'USD', (revenue.get(s.currency ?? 'USD') ?? 0) + Number(s.amount))
  const botReplies = bot ?? 0
  const allReplies = botReplies + (agent ?? 0)
  const botShare = allReplies ? Math.round((botReplies / allReplies) * 100) : 0
  const sold = money(revenue)

  const html = layout({
    title: `Así fue ${esc(monthLabel)} en ${esc(org.name)}`,
    body:
      kpis([
        { value: String(conversations), label: 'conversaciones' },
        { value: String(qualified), label: 'leads calificados' },
        { value: String(sales.length), label: 'reservas' },
        { value: sold, label: 'vendido' },
      ]) +
      p(
        `Llegaron ${leads.length} ${leads.length === 1 ? 'consulta nueva' : 'consultas nuevas'} y ${qualified} ${qualified === 1 ? 'quedó lista' : 'quedaron listas'} para cerrar. ` +
          `El bot respondió ${botReplies} ${botReplies === 1 ? 'mensaje' : 'mensajes'}, el ${botShare}% de todas las respuestas.`
      ) +
      p('Las ventas cuentan los leads que tu equipo marcó como Reservado, con su monto.'),
    cta: { label: 'Ver las métricas', url: `${appUrl()}/metrics` },
    footer: 'Recibes este resumen porque eres administrador de tu agencia en Tourfy. Puedes apagarlo en Configuración.',
  })

  return sendOnce(
    service,
    {
      orgId: org.id,
      kind: 'monthly_summary',
      dedupeKey: `monthly:${org.id}:${monthKey}${force ? `:test:${Date.now()}` : ''}`,
      to: await orgRecipients(service, org.id, { adminsOnly: true, onlySummary: true }),
      subject: `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)} en ${org.name}: ${sales.length} ${sales.length === 1 ? 'reserva' : 'reservas'} por ${sold}`,
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
    let query = service.from('organizations').select('id, name, bot_config, is_beta, features, plan').not('onboarded_at', 'is', null)
    if (onlyOrg) query = query.eq('id', onlyOrg)
    const { data: orgs } = await query
    let sent = 0
    for (const o of orgs ?? []) {
      if (!hasProFeature(o as unknown as OrgFeatureFlags, 'emailSummaries')) continue
      const tz = (o.bot_config as { timezone?: string } | null)?.timezone || 'America/Managua'
      try {
        if (await summarize(service, { id: o.id, name: o.name, tz }, force)) sent++
      } catch (error) {
        log.error('monthly summary failed for org', { error, org_id: o.id })
        Sentry.captureException(error, { tags: { route: 'cron/monthly-summary', org_id: o.id } })
      }
    }
    return NextResponse.json({ ok: true, orgs: orgs?.length ?? 0, sent })
  } catch (error) {
    log.error('monthly summary failed', { error })
    Sentry.captureException(error, { tags: { route: 'cron/monthly-summary' } })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
