import { createClient } from '@/lib/supabase/server'
import type { Lead, LeadStatus } from '@/types'

export async function getLeads(orgId: string, filters?: { status?: LeadStatus }) {
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select('id, org_id, contact_id, conversation_id, tour_interest, status, metadata, created_at, updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Lead[]
}

export async function getLeadStats(orgId: string, from: Date, to: Date) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select('status, metadata, created_at')
    .eq('org_id', orgId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (error) throw error
  return data
}

export async function createLead(
  orgId: string,
  contactId: string,
  conversationId?: string,
  tourInterest?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      contact_id: contactId,
      conversation_id: conversationId ?? null,
      tour_interest: tourInterest ?? null,
    })
    .select('id, org_id, contact_id, conversation_id, tour_interest, status, metadata, created_at, updated_at')
    .single()

  if (error) throw error
  return data as Lead
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}
