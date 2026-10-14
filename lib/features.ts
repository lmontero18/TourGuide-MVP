// Feature flags: se prueba en prod con las orgs del equipo antes de soltarlo.
// Un feature nuevo nace 'beta' (solo orgs con organizations.is_beta o con el
// feature en organizations.features). Para lanzarlo a todas las agencias se
// pasa a 'live'; cuando ya no hay vuelta atras se borra la entrada y el `if`.
// Las orgs se marcan con SQL (service role), un admin no puede auto-activarse.
// Ver docs/feature-flags.md.
import type { SupabaseClient } from '@supabase/supabase-js'

export type FeatureStage = 'beta' | 'live'

export const FEATURES = {
  reactions: 'beta', // CODE-193
  attachments: 'beta', // CODE-194
} as const satisfies Record<string, FeatureStage>

export type FeatureKey = keyof typeof FEATURES

export interface OrgFeatureFlags {
  is_beta: boolean
  features: string[]
}

export function hasFeature(org: OrgFeatureFlags | null | undefined, key: FeatureKey): boolean {
  if ((FEATURES[key] as FeatureStage) === 'live') return true
  if (!org) return false
  return org.is_beta || org.features.includes(key)
}

// Para webhook / crons con service client. Un feature 'live' no consulta la DB;
// si la consulta falla la org queda sin el feature (falla cerrado).
export async function orgHasFeature(supabase: SupabaseClient, orgId: string, key: FeatureKey): Promise<boolean> {
  if ((FEATURES[key] as FeatureStage) === 'live') return true
  const { data } = await supabase.from('organizations').select('is_beta, features').eq('id', orgId).maybeSingle()
  return hasFeature(data as OrgFeatureFlags | null, key)
}
