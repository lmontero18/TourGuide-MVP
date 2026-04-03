// types/index.ts
// Tipos globales del dominio — sincronizados con el schema real de Supabase (TourismSAAS)

// ─── Enums ───────────────────────────────────────────────

export type UserRole = 'admin' | 'agent'
export type ConversationStatus = 'open' | 'resolved' | 'pending'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type MessageRole = 'user' | 'assistant' | 'agent'
export type PlanType = 'starter' | 'growth' | 'pro'
export type OrgStatus = 'active' | 'inactive' | 'suspended'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

// ─── Tables ──────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  slug: string
  prompt: string | null
  faqs: FAQ[] | null
  bot_config: BotConfig | null
  plan: PlanType
  status: OrgStatus
  created_at: string
  updated_at: string
}

export interface BotConfig {
  buffer_seconds?: number
  default_lang?: string
}

export interface FAQ {
  question: string
  answer: string
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  org_id: string
  phone: string
  name: string | null
  channel: string
  custom_attributes: Record<string, unknown> | null
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
  metadata: LeadMetadata | null
  created_at: string
  updated_at: string
}

export interface LeadMetadata {
  dates?: string
  group_size?: number
  special_needs?: string
  [key: string]: unknown
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

export interface TwilioNumber {
  id: string
  phone_number: string
  twilio_sid: string
  org_id: string | null
  status: OrgStatus
  assigned_at: string | null
  created_at: string
}
