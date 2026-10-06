import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { toText } from '@/lib/email/layout'
import type { Logger } from '@/lib/logger'

export const appUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourfy.app').replace(/\/$/, '')
export const teamEmail = () => process.env.FEEDBACK_EMAIL || 'naia@naiaautomate.com'

// Correos del equipo de una agencia. adminsOnly = solo administradores;
// onlySummary = los que no apagaron el resumen diario.
export async function orgRecipients(
  service: SupabaseClient,
  orgId: string,
  opts: { adminsOnly?: boolean; onlySummary?: boolean } = {}
): Promise<string[]> {
  let query = service.from('users').select('email').eq('org_id', orgId)
  if (opts.adminsOnly) query = query.eq('role', 'admin')
  if (opts.onlySummary) query = query.eq('email_daily_summary', true)
  const { data } = await query
  return [...new Set(((data ?? []) as { email: string | null }[]).map((u) => u.email).filter((e): e is string => !!e))]
}

// Manda un correo una sola vez por dedupe_key (el registro va primero: si el
// cron o el webhook corren dos veces, el segundo choca con el indice unico y
// no reenvia). Devuelve false si ya se habia mandado o no hay destinatarios.
export async function sendOnce(
  service: SupabaseClient,
  input: { orgId: string | null; kind: string; dedupeKey: string; to: string[]; subject: string; html: string },
  log: Logger
): Promise<boolean> {
  if (!input.to.length) return false
  const { error } = await service
    .from('email_log')
    .insert({ org_id: input.orgId, kind: input.kind, dedupe_key: input.dedupeKey, recipients: input.to })
  if (error) {
    if (error.code !== '23505') log.warn('email_log insert failed', { error, kind: input.kind })
    return false
  }
  const text = toText(input.html)
  const results = await Promise.all(
    input.to.map((to) => sendEmail({ to, subject: input.subject, html: input.html, text }).catch(() => false))
  )
  const sent = results.filter(Boolean).length
  if (!sent) {
    // No salio ninguno (falta RESEND_API_KEY o fallo Resend): se borra el
    // registro para que el proximo intento lo vuelva a probar.
    await service.from('email_log').delete().eq('dedupe_key', input.dedupeKey)
    log.warn('email not sent (missing RESEND_API_KEY or Resend error)', { kind: input.kind, org_id: input.orgId })
  }
  return sent > 0
}
