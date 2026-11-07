import 'server-only'
import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { canEditKnowledge } from '@/lib/features'
import type { Role } from '@/types'

type EditorContext =
  | { ok: true; userId: string; orgId: string; role: Role; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse }

// Guard para guardar Tours y preguntas (tours, FAQs, info del negocio,
// recogidas): solo admins (CODE-200). El rol se lee de public.users, nunca
// del cliente.
export async function requireKnowledgeEditor(): Promise<EditorContext> {
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

  if (!profile?.org_id || !canEditKnowledge(profile.role)) {
    return { ok: false, response: NextResponse.json({ error: t('adminOnly') }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, orgId: profile.org_id, role: profile.role as Role, supabase }
}
