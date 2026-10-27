import 'server-only'
import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { canEditKnowledge, type OrgFeatureFlags } from '@/lib/features'
import type { Role } from '@/types'

type EditorContext =
  | { ok: true; userId: string; orgId: string; role: Role; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse }

// Guard para Tours y preguntas (tours, FAQs, info del negocio, recogidas):
// admins siempre, agentes si la org tiene el flag agentKnowledge. El rol se
// lee de public.users, nunca del cliente.
export async function requireKnowledgeEditor(): Promise<EditorContext> {
  const supabase = await createClient()
  const t = await getTranslations('apiErrors')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: t('unauthorized') }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role, organizations(is_beta, features)')
    .eq('id', user.id)
    .single()

  const org = profile?.organizations as unknown as OrgFeatureFlags | null
  if (!profile?.org_id || !canEditKnowledge(profile.role, org)) {
    return { ok: false, response: NextResponse.json({ error: t('adminOnly') }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, orgId: profile.org_id, role: profile.role as Role, supabase }
}
