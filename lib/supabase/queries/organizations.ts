import { createClient } from '@/lib/supabase/server'
import type { Organization, BotConfig, FAQ, Tour } from '@/types'

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
