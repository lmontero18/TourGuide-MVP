import 'server-only'
import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'

type MemberContext =
  | { ok: true; userId: string; orgId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse }

// Guard para API routes del trabajo diario: usuario logueado con org, admin o
// agente. Devuelve el cliente con la sesion: lo que sigue corre con RLS.
export async function requireMember(): Promise<MemberContext> {
  const supabase = await createClient()
  const t = await getTranslations('apiErrors')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: t('unauthorized') }, { status: 401 }) }
  }

  const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) {
    return { ok: false, response: NextResponse.json({ error: t('forbidden') }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, orgId: profile.org_id, supabase }
}
