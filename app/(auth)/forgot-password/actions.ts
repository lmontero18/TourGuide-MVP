'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, recordAttempt } from '@/lib/auth/rateLimit'

const emailSchema = z.string().trim().toLowerCase().email()

type ResetResult = { ok: true } | { ok: false; retryAfter: number }

// Siempre responde ok (salvo rate limit): decir "ese email no existe" le
// regala a cualquiera la lista de cuentas. El link del correo lo arma el
// template "Reset password" de Supabase → /auth/confirm?type=recovery&next=/set-password.
export async function requestPasswordReset(rawEmail: string): Promise<ResetResult> {
  const parsed = emailSchema.safeParse(rawEmail)
  if (!parsed.success) return { ok: true }

  const identifier = `reset:${await getClientIp()}`
  const limit = await checkRateLimit(identifier, { countAll: true })
  if (!limit.ok) return { ok: false, retryAfter: limit.retryAfter ?? 1 }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data)
  await recordAttempt(identifier, !error)

  return { ok: true }
}
