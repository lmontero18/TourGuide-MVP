// TODO: implement with Supabase client
import type { Message } from '@/types'

export async function getMessages(_conversationId: string): Promise<Message[]> {
  return []
}

export async function insertMessage(_message: Partial<Message>): Promise<Message | null> {
  return null
}
