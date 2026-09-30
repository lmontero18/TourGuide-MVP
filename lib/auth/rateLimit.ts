import 'server-only'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

// Rate limiting de auth (login, signup, reset de contraseña) sobre la tabla
// login_attempts. Vive fuera de los archivos 'use server' a proposito: todo lo
// que exporta un archivo de server actions queda invocable como endpoint POST,
// y recordAttempt no puede ser publico.

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

export async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

export async function checkRateLimit(
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

export async function recordAttempt(identifier: string, success: boolean) {
  const service = await createServiceClient()
  await service.from('login_attempts').insert({ identifier, success })
}
