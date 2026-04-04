import { createClient } from '@/lib/supabase/server'
import type { Message, MessageRole } from '@/types'

export async function getMessages(conversationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, from_bot, channel, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Message[]
}

export async function insertMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  fromBot: boolean
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      from_bot: fromBot,
    })
    .select('id, conversation_id, role, content, from_bot, channel, created_at')
    .single()

  if (error) throw error
  return data as Message
}
