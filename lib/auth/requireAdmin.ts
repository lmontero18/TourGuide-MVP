import 'server-only'
import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'

type AdminContext =
  | { ok: true; userId: string; orgId: string }
  | { ok: false; response: NextResponse }

// Guard para API routes de gestion: usuario logueado, admin y con org. El rol
// se lee de public.users (nunca del cliente ni de la metadata del JWT).
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient()
  const t = await getTranslations('apiErrors')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: t('unauthorized') }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || !profile.org_id) {
    return { ok: false, response: NextResponse.json({ error: t('adminOnly') }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, orgId: profile.org_id }
}
