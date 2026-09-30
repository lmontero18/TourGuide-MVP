import type { Assignee } from '@/types'

interface AssignedAgentRow {
  id: string
  full_name: string | null
  email: string
}

// Normaliza el embed `assigned_agent:users!conversations_assigned_agent_id_fkey(...)`.
// Nombre visible: full_name o la parte local del email.
export function toAssignee(row: AssignedAgentRow | null | undefined): Assignee | null {
  if (!row) return null
  return { id: row.id, name: row.full_name?.trim() || row.email.split('@')[0] }
}

export function initialsOf(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

// Version corta para badges: los dos primeros nombres ("Luis Andres
// Valenciano Barboza" -> "Luis Andres"). El nombre completo va en el tooltip.
export function shortName(name: string): string {
  return name.split(/\s+/).slice(0, 2).join(' ')
}

export const ASSIGNED_AGENT_EMBED = 'assigned_agent:users!conversations_assigned_agent_id_fkey(id, full_name, email)'
