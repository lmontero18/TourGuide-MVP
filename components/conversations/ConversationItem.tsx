import type { Conversation } from '@/types'

interface ConversationItemProps {
  conversation: Conversation
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  return (
    <div>
      <span>{conversation.contact_name ?? conversation.contact_phone}</span>
      <span>{conversation.status}</span>
    </div>
  )
}
