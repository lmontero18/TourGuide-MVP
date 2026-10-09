'use server'

import { z } from 'zod'
import { getLocale } from 'next-intl/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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

  await rememberEmailLocale(parsed.data)
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data)
  await recordAttempt(identifier, !error)

  return { ok: true }
}

// El correo de "Restablece tu contraseña" es bilingue (template de Supabase,
// supabase/templates/recovery.html) y elige el idioma por
// user_metadata.locale: se guarda el de la pantalla desde donde se pidio. Si
// el correo no existe no se hace nada (y no se le cuenta a nadie).
async function rememberEmailLocale(email: string) {
  try {
    const locale = (await getLocale()) === 'en' ? 'en' : 'es'
    const service = await createServiceClient()
    const { data: profile } = await service.from('users').select('id').eq('email', email).maybeSingle()
    if (!profile) return
    const { data } = await service.auth.admin.getUserById(profile.id)
    const meta = data.user?.user_metadata ?? {}
    if (meta.locale === locale) return
    await service.auth.admin.updateUserById(profile.id, { user_metadata: { ...meta, locale } })
  } catch {
    // Sin locale el correo sale en español: no frenar el reset por esto.
  }
}
