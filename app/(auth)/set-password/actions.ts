'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { passwordSchema } from '@/lib/auth/password'

const setPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })

// Llegan aca con sesion recien creada por /auth/confirm (verifyOtp del link
// de invitacion o de recuperacion). Sin sesion no hay a quien cambiarle nada.
export async function setPassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?error=${encodeURIComponent('Your link expired. Ask for a new one.')}`)
  }

  const parsed = setPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    redirect(`/set-password?error=${encodeURIComponent(msg)}`)
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    redirect(`/set-password?error=${encodeURIComponent(error.message)}`)
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
