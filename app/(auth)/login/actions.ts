'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, recordAttempt } from '@/lib/auth/rateLimit'
import { passwordSchema } from '@/lib/auth/password'

// Los mensajes de zod son claves de `auth.errors`: se traducen al locale del
// request antes de viajar en ?error= (la pagina los muestra tal cual en el toast).
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('invalidEmail'),
  password: z.string().min(1, 'passwordRequired'),
})

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('invalidEmail'),
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'fullNameRequired').max(100).optional().or(z.literal('')),
})

async function issueMessage(issue: { message: string; path: PropertyKey[] } | undefined): Promise<string> {
  const t = await getTranslations('auth.errors')
  if (issue && t.has(issue.message)) return t(issue.message)
  // passwordSchema (lib/auth/password) trae mensajes propios en ingles.
  if (issue?.path[0] === 'password') return t('passwordRules')
  return t('invalidInput')
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const msg = await issueMessage(parsed.error.issues[0])
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  const { email, password } = parsed.data
  const ip = await getClientIp()
  const identifier = `${ip}:${email}`

  const limit = await checkRateLimit(identifier)
  if (!limit.ok) {
    const t = await getTranslations('auth.errors')
    redirect(`/login?error=${encodeURIComponent(t('tooMany', { minutes: limit.retryAfter ?? 1 }))}`)
  }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await recordAttempt(identifier, false)
    const t = await getTranslations('auth.errors')
    redirect(`/login?error=${encodeURIComponent(t('invalidCredentials'))}`)
  }

  await recordAttempt(identifier, true)

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, organizations(onboarded_at)')
    .eq('id', data.user.id)
    .maybeSingle()

  revalidatePath('/', 'layout')

  const orgData = profile?.organizations as unknown as { onboarded_at: string | null } | { onboarded_at: string | null }[] | null
  const org = Array.isArray(orgData) ? orgData[0] : orgData
  if (!org?.onboarded_at) {
    redirect('/onboarding')
  }

  redirect('/conversations')
}

// BETA CERRADA — el registro publico esta desactivado.
//
// Las altas se hacen invitando desde Supabase (Authentication -> Users -> Invite):
// el invitado confirma el mail y cae en /onboarding sin org, donde crea su agencia.
//
// Esta action queda cortada de entrada en vez de borrada: es una server action, o
// sea un endpoint POST que Next expone igual aunque ningun formulario la use. Si
// solo sacaramos el form, seguiria siendo invocable.
//
// Ojo: esto NO es el gate. El gate es "Allow new users to sign up" desactivado en
// el proyecto de Supabase — sin eso, POST /auth/v1/signup con la anon key (que va
// en el bundle del browser) sigue creando usuarios sin pasar por aca.
//
// Para reabrir el registro publico: poner SIGNUP_ENABLED = true, restaurar la
// pagina /register y su redirect en next.config (ver historial de git), y
// reactivar el signup en Supabase.
const SIGNUP_ENABLED = false

export async function signup(formData: FormData) {
  if (!SIGNUP_ENABLED) {
    // Sin ?error=: el mensaje iria crudo al toast, en español y sin pasar por
    // next-intl, y un usuario en locale `en` lo veria en el idioma equivocado.
    // La pagina de login ya muestra "Beta cerrada — el acceso es por invitacion"
    // traducido (auth.login.noAccount), asi que el toast seria redundante.
    redirect('/login')
  }

  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('full_name'),
  })

  if (!parsed.success) {
    const msg = await issueMessage(parsed.error.issues[0])
    redirect(`/register?error=${encodeURIComponent(msg)}`)
  }

  const { email, password, fullName } = parsed.data

  const ip = await getClientIp()
  const identifier = `signup:${ip}`

  const limit = await checkRateLimit(identifier, { countAll: true })
  if (!limit.ok) {
    const t = await getTranslations('auth.errors')
    redirect(`/register?error=${encodeURIComponent(t('tooMany', { minutes: limit.retryAfter ?? 1 }))}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || null },
    },
  })

  await recordAttempt(identifier, !error)

  if (error) {
    const t = await getTranslations('auth.errors')
    redirect(`/register?error=${encodeURIComponent(t('signupFailed'))}`)
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
