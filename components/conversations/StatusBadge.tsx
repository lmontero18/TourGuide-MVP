import type { ConversationStatus } from '@/types'

interface StatusBadgeProps {
  status: ConversationStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span>{status}</span>
}
