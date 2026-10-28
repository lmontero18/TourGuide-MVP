// Feature flags: se prueba en prod con las orgs del equipo antes de soltarlo.
// Un feature nuevo nace 'beta' (solo orgs con organizations.is_beta o con el
// feature en organizations.features). Para lanzarlo a todas las agencias se
// pasa a 'live'; cuando ya no hay vuelta atras se borra la entrada y el `if`.
// Las orgs se marcan con SQL (service role), un admin no puede auto-activarse.
// Ver docs/feature-flags.md.
import type { SupabaseClient } from '@supabase/supabase-js'

export type FeatureStage = 'beta' | 'live'

export const FEATURES = {
  reactions: 'live', // CODE-193
  attachments: 'live', // CODE-194
  notifications: 'live', // CODE-195
  pickups: 'live', // Recogidas por zona y tour
  bookings: 'beta', // Reservas por dia con hora de recogida
  leadPanel: 'live', // Ficha del cliente siempre abierta a la derecha del chat
  inboxPreview: 'live', // Bandeja nueva, aviso "Que esta pasando" y modo oscuro
  // Agentes editan Tours y preguntas (en la DB: can_edit_knowledge(), ya sin
  // flag desde 20261027020000).
  agentKnowledge: 'live',
  teamMetrics: 'beta', // Pestaña Equipo en Metricas (por agente)
  celebrations: 'live', // Confeti al marcar una venta como Reservado
  // Conversacion resuelta que se reabre: si una persona la atendio en las
  // ultimas 24 h vuelve a esa persona (con aviso), no al bot.
  stickyAgent: 'live',
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

// Tours, preguntas, info del negocio y recogidas: los admins siempre, los
// agentes con el flag agentKnowledge.
export function canEditKnowledge(role: string | null | undefined, org: OrgFeatureFlags | null | undefined): boolean {
  return role === 'admin' || (role === 'agent' && hasFeature(org, 'agentKnowledge'))
}

// Para webhook / crons con service client. Un feature 'live' no consulta la DB;
// si la consulta falla la org queda sin el feature (falla cerrado).
export async function orgHasFeature(supabase: SupabaseClient, orgId: string, key: FeatureKey): Promise<boolean> {
  if ((FEATURES[key] as FeatureStage) === 'live') return true
  const { data } = await supabase.from('organizations').select('is_beta, features').eq('id', orgId).maybeSingle()
  return hasFeature(data as OrgFeatureFlags | null, key)
}
