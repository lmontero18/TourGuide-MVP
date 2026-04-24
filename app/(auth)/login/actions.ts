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

async function checkRateLimit(identifier: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const service = await createServiceClient()
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()

  const { data, error } = await service
    .from('login_attempts')
    .select('attempted_at, success')
    .eq('identifier', identifier)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: false })

  if (error) return { ok: true }

  const failures = (data ?? []).filter((r) => !r.success)
  if (failures.length >= MAX_ATTEMPTS) {
    const oldest = new Date(failures[failures.length - 1].attempted_at).getTime()
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
    .select('org_id')
    .eq('id', data.user.id)
    .single()

  revalidatePath('/', 'layout')

  if (!profile?.org_id) {
    redirect('/onboarding')
  }

  redirect('/conversations')
}

export async function signup(formData: FormData) {
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

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || null },
    },
  })

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
