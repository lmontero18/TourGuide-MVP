export type Role = 'admin' | 'agent'
export type ConversationStatus = 'bot' | 'waiting' | 'active' | 'resolved'
export type LeadStatus = 'new' | 'qualified' | 'booked' | 'lost'
export type MessageRole = 'user' | 'bot' | 'agent'

export interface Organization {
  id: string
  name: string
  slug: string
  prompt: string | null
  faqs: FAQ[]
  config: OrgConfig
  twilio_number: string | null
  created_at: string
}

export interface OrgConfig {
  business_hours?: { start: string; end: string; timezone: string }
  language?: string
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
  role: Role
  is_active: boolean
}

export interface Conversation {
  id: string
  org_id: string
  contact_phone: string
  contact_name: string | null
  status: ConversationStatus
  assigned_to: string | null
  is_after_hours: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  created_at: string
}

export interface Lead {
  id: string
  org_id: string
  conversation_id: string
  contact_phone: string
  tour_interest: string | null
  group_size: number | null
  estimated_value: number | null
  status: LeadStatus
  created_at: string
}
