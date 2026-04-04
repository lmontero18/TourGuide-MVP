import { createClient } from '@/lib/supabase/server'
import type { Conversation, ConversationStatus } from '@/types'

export async function getConversations(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('id, org_id, contact_id, status, bot_active, assigned_agent_id, last_message_at, created_at, updated_at')
    .eq('org_id', orgId)
    .order('last_message_at', { ascending: false })

  if (error) throw error
  return data as Conversation[]
}

export async function getConversationById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('id, org_id, contact_id, status, bot_active, assigned_agent_id, last_message_at, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Conversation
}

export async function updateConversationStatus(id: string, status: ConversationStatus) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

export async function takeControl(conversationId: string, agentId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('conversations')
    .update({ bot_active: false, assigned_agent_id: agentId, status: 'open' as ConversationStatus })
    .eq('id', conversationId)

  if (error) throw error
}

export async function returnToBot(conversationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('conversations')
    .update({ bot_active: true, assigned_agent_id: null })
    .eq('id', conversationId)

  if (error) throw error
}
