// Feature flags: se prueba en prod con las orgs del equipo antes de soltarlo.
// Un feature nuevo nace 'beta' (solo orgs con organizations.is_beta o con el
// feature en organizations.features). Para lanzarlo a todas las agencias se
// pasa a 'live'; cuando ya no hay vuelta atras se borra la entrada y el `if`.
// Las orgs se marcan con SQL (service role), un admin no puede auto-activarse.
// Ver docs/feature-flags.md.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanType } from '@/types'

export type FeatureStage = 'beta' | 'live'

export const FEATURES = {
  reactions: 'live', // CODE-193
  attachments: 'live', // CODE-194
  notifications: 'live', // CODE-195
  pickups: 'live', // Recogidas por zona y tour
  bookings: 'beta', // Reservas por dia con hora de recogida
  leadPanel: 'live', // Ficha del cliente siempre abierta a la derecha del chat
  inboxPreview: 'live', // Bandeja nueva, aviso "Que esta pasando" y modo oscuro
  // Pestaña Equipo en Metricas (por agente). Las ventas por persona son Pro
  // (CODE-204).
  teamMetrics: 'live',
  celebrations: 'live', // Confeti al marcar una venta como Reservado
  // Conversacion resuelta que se reabre: si una persona la atendio en las
  // ultimas 24 h vuelve a esa persona (con aviso), no al bot.
  stickyAgent: 'live',
  // Fotos que manda el agente: se achican en el navegador antes de subirlas.
  compressAgentPhotos: 'live',
  // Logo y nombre de la agencia arriba del menu; "Powered by Tourfy" abajo.
  orgBranding: 'live',
  // Planes Starter / Pro (CODE-201). Apagado: hasPlan() responde que si para
  // todo, nadie pierde nada hasta lanzarlo.
  plans: 'beta',
} as const satisfies Record<string, FeatureStage>

export type FeatureKey = keyof typeof FEATURES

export interface OrgFeatureFlags {
  is_beta: boolean
  features: string[]
  // organizations.plan. Hace falta para hasPlan(): sin el, con el flag
  // `plans` prendido la org cuenta como Starter.
  plan?: PlanType
}

export function hasFeature(org: OrgFeatureFlags | null | undefined, key: FeatureKey): boolean {
  if ((FEATURES[key] as FeatureStage) === 'live') return true
  if (!org) return false
  return org.is_beta || org.features.includes(key)
}

// Tours, preguntas, info del negocio y recogidas: solo el admin (CODE-200).
// Los agentes los ven en solo lectura. En la DB: can_edit_knowledge().
export function canEditKnowledge(role: string | null | undefined): boolean {
  return role === 'admin'
}

// Para webhook / crons con service client. Un feature 'live' no consulta la DB;
// si la consulta falla la org queda sin el feature (falla cerrado).
export async function orgHasFeature(supabase: SupabaseClient, orgId: string, key: FeatureKey): Promise<boolean> {
  if ((FEATURES[key] as FeatureStage) === 'live') return true
  const { data } = await supabase.from('organizations').select('is_beta, features').eq('id', orgId).maybeSingle()
  return hasFeature(data as OrgFeatureFlags | null, key)
}

// ---------------------------------------------------------------------------
// Planes (CODE-201). Ver docs/plans.md.
//
// El plan sale de organizations.plan, la unica fuente de verdad para el acceso.
// subscriptions.plan es lo que se cobra y no decide nada en la app. El admin no
// puede cambiar su plan (sin grant de UPDATE en esa columna): solo SQL o el
// service role. El bot nunca pregunta el plan para decidir si responde.

const PLAN_RANK: Record<PlanType, number> = { starter: 0, pro: 1 }

// Lo que es solo Pro, en un solo lugar. Las pantallas y las API routes
// preguntan con hasProFeature(); el chequeo del servidor es el que vale.
export const PRO_FEATURES = [
  'leadsBoard', // Pantalla de Leads y ficha completa del cliente (CODE-203)
  'businessMetrics', // Ventas con Tourfy, por mes y por persona (CODE-204)
  'bookings', // Reservas del dia (CODE-205)
  'pickups', // Recogidas: tabla y hora que da el bot (CODE-205)
  'emailSummaries', // Resumen diario y mensual por correo (CODE-206)
  'branding', // Logo de la agencia en el panel (CODE-207)
  'csvExport', // Exportar a CSV
] as const

export type ProFeature = (typeof PRO_FEATURES)[number]

// ¿La org tiene al menos este plan? Con el flag `plans` apagado, siempre si.
export function hasPlan(org: OrgFeatureFlags | null | undefined, required: PlanType): boolean {
  if (!hasFeature(org, 'plans')) return true
  return PLAN_RANK[org?.plan ?? 'starter'] >= PLAN_RANK[required]
}

export function hasProFeature(org: OrgFeatureFlags | null | undefined, feature: ProFeature): boolean {
  return PRO_FEATURES.includes(feature) ? hasPlan(org, 'pro') : true
}

// Para webhook / crons / API routes con service client. Si la consulta falla
// la org cuenta como Starter (falla cerrado), salvo con el flag apagado.
export async function orgHasPlan(supabase: SupabaseClient, orgId: string, required: PlanType): Promise<boolean> {
  const { data } = await supabase.from('organizations').select('is_beta, features, plan').eq('id', orgId).maybeSingle()
  return hasPlan(data as OrgFeatureFlags | null, required)
}
