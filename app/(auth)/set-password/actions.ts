'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { passwordSchema } from '@/lib/auth/password'

const setPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'passwordMismatch', path: ['confirm'] })

// Llegan aca con sesion recien creada por /auth/confirm (verifyOtp del link
// de invitacion o de recuperacion). Sin sesion no hay a quien cambiarle nada.
export async function setPassword(formData: FormData) {
  // Los errores viajan en ?error= y la pagina los muestra tal cual: se traducen aca.
  const t = await getTranslations('auth.errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?error=${encodeURIComponent(t('linkExpired'))}`)
  }

  const parsed = setPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    // passwordSchema (lib/auth/password) trae mensajes en ingles: cualquier
    // falla del campo password se resume en las reglas, que la pagina ya muestra.
    const key = issue?.message === 'passwordMismatch'
      ? 'passwordMismatch'
      : issue?.path[0] === 'password' ? 'passwordRules' : 'invalidInput'
    redirect(`/set-password?error=${encodeURIComponent(t(key))}`)
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    // GoTrue responde en ingles; solo el caso comun tiene mensaje propio.
    const key = error.code === 'same_password' ? 'samePassword' : 'passwordSaveFailed'
    redirect(`/set-password?error=${encodeURIComponent(t(key))}`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, organizations(onboarded_at)')
    .eq('id', user.id)
    .maybeSingle()

  revalidatePath('/', 'layout')

  // Agente invitado → ya tiene org onboardeada. Dueño de agencia invitado desde
  // Supabase (beta cerrada) → sin org, arma la suya en /onboarding.
  const orgData = profile?.organizations as unknown as { onboarded_at: string | null } | { onboarded_at: string | null }[] | null
  const org = Array.isArray(orgData) ? orgData[0] : orgData
  redirect(org?.onboarded_at ? '/conversations' : '/onboarding')
}
