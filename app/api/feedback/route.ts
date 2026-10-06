import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { createLogger } from '@/lib/logger'

const log = createLogger({ route: 'feedback' })

const schema = z.object({
  kind: z.enum(['bug', 'idea', 'other']),
  message: z.string().trim().min(3).max(4000),
  page: z.string().max(300).optional(),
})

// Tope por usuario para que el formulario no se use como spam.
const MAX_PER_HOUR = 10
const KIND_LABEL = { bug: 'Error', idea: 'Idea / función', other: 'Otro' } as const

// Comentarios desde el panel → tabla feedback + correo al equipo de Tourfy.
export async function POST(request: NextRequest) {
  const t = await getTranslations('apiErrors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: t('unauthorized') }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: t('invalidInput') }, { status: 400 })

  const service = await createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('org_id, full_name, email, role, organizations(name)')
    .eq('id', user.id)
    .maybeSingle()

  const { count } = await service
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 3_600_000).toISOString())
  if ((count ?? 0) >= MAX_PER_HOUR) return NextResponse.json({ error: t('feedbackRateLimited') }, { status: 429 })

  const { kind, message, page } = parsed.data
  const { data: row, error } = await service
    .from('feedback')
    .insert({
      org_id: profile?.org_id ?? null,
      user_id: user.id,
      kind,
      message,
      page: page ?? null,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    })
    .select('id')
    .single()
  if (error || !row) {
    log.error('feedback insert failed', { error, org_id: profile?.org_id })
    return NextResponse.json({ error: t('feedbackFailed') }, { status: 500 })
  }

  const org = (profile?.organizations as { name?: string } | null)?.name ?? 'sin agencia'
  const who = profile?.full_name || profile?.email || user.email || user.id
  const emailed = await sendEmail({
    to: process.env.FEEDBACK_EMAIL || 'naia@naiaautomate.com',
    subject: `[Tourfy · ${KIND_LABEL[kind]}] ${org}: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`,
    text: [
      `Tipo: ${KIND_LABEL[kind]}`,
      `Agencia: ${org}`,
      `De: ${who} (${profile?.role ?? 'sin rol'}) <${profile?.email ?? user.email ?? ''}>`,
      `Página: ${page ?? '-'}`,
      '',
      message,
    ].join('\n'),
    replyTo: profile?.email ?? user.email ?? undefined,
  }).catch(() => false)

  if (emailed) {
    await service.from('feedback').update({ emailed: true }).eq('id', row.id)
  } else {
    // Sin correo (falta RESEND_API_KEY o fallo Resend): queda en la tabla y
    // avisa a Sentry para que no pase desapercibido.
    Sentry.captureMessage(`Feedback (${KIND_LABEL[kind]}) de ${org}`, {
      level: kind === 'bug' ? 'warning' : 'info',
      tags: { area: 'feedback', org_id: profile?.org_id ?? 'none' },
      extra: { message, page, who },
    })
  }
  return NextResponse.json({ ok: true })
}
