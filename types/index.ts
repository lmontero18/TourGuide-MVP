export type Role = 'admin' | 'agent'
export type ConversationStatus = 'open' | 'resolved' | 'pending'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type MessageRole = 'user' | 'assistant' | 'agent'
export type PlanType = 'starter' | 'growth' | 'pro'
export type OrgStatus = 'active' | 'inactive' | 'suspended'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export interface Organization {
  id: string
  name: string
  slug: string
  prompt: string | null
  faqs: FAQ[]
  tours: Tour[]
  business_info: BusinessSection[]
  bot_config: BotConfig
  plan: PlanType
  status: OrgStatus
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export type BotTone = 'formal' | 'friendly' | 'casual'

export interface BusinessHours {
  start: string  // HH:MM 24h format
  end: string    // HH:MM 24h format
}

export interface BotConfig {
  buffer_seconds?: number
  default_lang?: string
  timezone?: string
  business_hours?: BusinessHours
  tone?: BotTone
  greeting?: string  // primer mensaje sugerido del bot. Se incluye en el prompt compilado.
}

export interface FAQ {
  question: string
  answer: string
}

export type TourSource = 'manual' | 'url' | 'pdf' | 'photo' | 'learned'

// Tarifa estructurada. Lista dinamica: un tour tiene 0, 1 o varias (Local/Extranjero/Nino/Grupo).
// La IA solo carga las que existen en la fuente; no inventa tarifas ni convierte monedas.
export interface PriceTier {
  label?: string    // "Local", "Extranjero", "Nino", "Grupo", "Desde"... opcional
  amount: number
  currency: string  // codigo ISO: USD, CRC, PEN, MXN...
}

// Tour flexible: `prices` son las tarifas estructuradas (cada una en su moneda),
// e `info` queda como notas libres (que incluye, duracion, condiciones) SIN los precios.
export interface Tour {
  id: string
  name: string
  category?: string
  prices?: PriceTier[]
  info: string
  source?: TourSource
  confidence?: number  // 0..1 de la extraccion por IA. <0.6 => bandera de revision en la UI.
}

// Seccion titulada del contexto general del negocio (sobre nosotros, politicas,
// formas de pago, contacto, horarios, zonas, etc.). Flexible: la IA crea las que existan.
export interface BusinessSection {
  id: string
  title: string
  content: string
  source?: TourSource
  confidence?: number
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  org_id: string
  phone: string
  name: string | null
  channel: string
  custom_attributes: Record<string, unknown>
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  org_id: string
  contact_id: string
  status: ConversationStatus
  bot_active: boolean
  assigned_agent_id: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  from_bot: boolean
  channel: string
  created_at: string
}

export interface Lead {
  id: string
  org_id: string
  contact_id: string
  conversation_id: string | null
  tour_interest: string | null
  status: LeadStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WhatsAppAccount {
  id: string
  org_id: string
  waba_id: string
  phone_number_id: string
  phone_number: string
  access_token: string
  status: OrgStatus
  connected_at: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanType
  status: SubscriptionStatus
  current_period_end: string | null
  created_at: string
  updated_at: string
}
