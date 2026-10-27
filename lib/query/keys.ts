import type { MetricsPeriod } from '@/types'

// Claves de TanStack Query en un solo lugar: invalidar o actualizar una
// consulta desde otra pantalla usa exactamente la misma clave.
export const queryKeys = {
  organization: ['organization'] as const,
  whatsappAccount: ['whatsapp-account'] as const,
  templates: ['templates'] as const,
  templateHistory: (month: string) => ['templates', 'history', month] as const,
  agents: ['agents'] as const,
  metrics: (period: MetricsPeriod) => ['metrics', period] as const,
  teamMetrics: (period: MetricsPeriod) => ['metrics', 'team', period] as const,
  businessMetrics: (period: MetricsPeriod) => ['metrics', 'business', period] as const,
  usage: ['usage', 'current'] as const,
  usageHistory: ['usage', 'history'] as const,
  leads: (orgId: string | null) => ['leads', orgId] as const,
  conversationLead: (conversationId: string) => ['leads', 'by-conversation', conversationId] as const,
  contactLeads: (contactId: string) => ['leads', 'by-contact', contactId] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  pickups: ['pickups'] as const,
  bookingsRange: (from: string, to: string) => ['bookings', 'range', from, to] as const,
  leadBookings: (leadId: string) => ['bookings', 'by-lead', leadId] as const,
}
