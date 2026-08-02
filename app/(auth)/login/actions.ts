'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or less')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  fullName: z.string().trim().min(1, 'Full name is required').max(100).optional().or(z.literal('')),
})

async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

async function checkRateLimit(
  identifier: string,
  { countAll = false }: { countAll?: boolean } = {}
): Promise<{ ok: boolean; retryAfter?: number }> {
  const service = await createServiceClient()
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()

  const { data, error } = await service
    .from('login_attempts')
    .select('attempted_at, success')
    .eq('identifier', identifier)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: false })

  if (error) return { ok: true }

  // Login counts only failures (successful logins are fine); signup counts
  // every attempt to stop mass account creation from one IP.
  const counted = countAll ? (data ?? []) : (data ?? []).filter((r) => !r.success)
  if (counted.length >= MAX_ATTEMPTS) {
    const oldest = new Date(counted[counted.length - 1].attempted_at).getTime()
    const retryAfter = Math.ceil((oldest + WINDOW_MINUTES * 60 * 1000 - Date.now()) / 60000)
    return { ok: false, retryAfter: Math.max(retryAfter, 1) }
  }

  return { ok: true }
}

async function recordAttempt(identifier: string, success: boolean) {
  const service = await createServiceClient()
  await service.from('login_attempts').insert({ identifier, success })
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  const { email, password } = parsed.data
  const ip = await getClientIp()
  const identifier = `${ip}:${email}`

  const limit = await checkRateLimit(identifier)
  if (!limit.ok) {
    redirect(`/login?error=${encodeURIComponent(`Too many attempts. Try again in ${limit.retryAfter} min.`)}`)
  }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await recordAttempt(identifier, false)
    redirect(`/login?error=${encodeURIComponent('Invalid email or password')}`)
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
// Para reabrir el registro publico: borrar este bloque y restaurar la pagina
// /register (ver historial de git), ademas de reactivar el signup en Supabase.
const SIGNUP_ENABLED = false

export async function signup(formData: FormData) {
  if (!SIGNUP_ENABLED) {
    redirect('/login?error=' + encodeURIComponent('Beta cerrada — el acceso es por invitacion.'))
  }

  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('full_name'),
  })

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    redirect(`/register?error=${encodeURIComponent(msg)}`)
  }

  const { email, password, fullName } = parsed.data

  const ip = await getClientIp()
  const identifier = `signup:${ip}`

  const limit = await checkRateLimit(identifier, { countAll: true })
  if (!limit.ok) {
    redirect(`/register?error=${encodeURIComponent(`Too many attempts. Try again in ${limit.retryAfter} min.`)}`)
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
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
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
