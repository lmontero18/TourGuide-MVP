import { createClient } from '@/lib/supabase/client'

export async function takeControl(conversationId: string, agentId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({ bot_active: false, assigned_agent_id: agentId, status: 'open' })
    .eq('id', conversationId)

  if (error) throw error
}

export async function returnToBot(conversationId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('conversations')
    .update({ bot_active: true, assigned_agent_id: null })
    .eq('id', conversationId)

  if (error) throw error
}
