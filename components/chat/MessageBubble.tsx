import type { MessageRole } from '@/types'

interface MessageBubbleProps {
  content: string
  role: MessageRole
  createdAt: string
}

export function MessageBubble({ content, role, createdAt }: MessageBubbleProps) {
  return (
    <div data-role={role} data-time={createdAt}>
      <p>{content}</p>
    </div>
  )
}
