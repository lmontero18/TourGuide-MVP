import { createClient } from '@/lib/supabase/server'
import type { Organization, BotConfig, FAQ, Tour } from '@/types'
import type { OrgFeatureFlags } from '@/lib/features'

export async function getOrg(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, prompt, faqs, tours, bot_config, plan, status, created_at, updated_at')
    .eq('id', orgId)
    .single()

  if (error) throw error
  return data as Organization
}

export async function updateOrgConfig(
  orgId: string,
  config: { prompt?: string; faqs?: FAQ[]; tours?: Tour[]; bot_config?: BotConfig }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organizations')
    .update(config)
    .eq('id', orgId)

  if (error) throw error
}

// Flags de la org del usuario (RLS: solo lee la suya). Si falla, la org queda
// sin features beta: nunca se rompe la pantalla por un flag.
export async function getOrgFeatureFlags(orgId: string): Promise<OrgFeatureFlags | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('is_beta, features')
    .eq('id', orgId)
    .maybeSingle()

  if (error || !data) return null
  return data
}
