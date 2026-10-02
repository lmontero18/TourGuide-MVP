'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { Role, TeamMember } from '@/types'

type ActionResult = { ok: true } | { ok: false; error: string; code?: string }

async function call(url: string, init?: RequestInit): Promise<ActionResult> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({}))
  return { ok: false, error: body.error ?? 'Request failed', code: body.code }
}

async function fetchAgents(): Promise<TeamMember[]> {
  const res = await fetch('/api/agents')
  if (!res.ok) throw new Error(String(res.status))
  const body: { agents: TeamMember[] } = await res.json()
  return body.agents
}

// Gestion del equipo via /api/agents (auth.users solo se lee con service role).
export function useAgents() {
  const queryClient = useQueryClient()
  const { data, isError } = useQuery({ queryKey: queryKeys.agents, queryFn: fetchAgents })

  const withReload = useCallback(
    async (p: Promise<ActionResult>) => {
      const result = await p
      if (result.ok) void queryClient.invalidateQueries({ queryKey: queryKeys.agents })
      return result
    },
    [queryClient]
  )

  return {
    agents: data ?? null,
    error: isError,
    invite: (email: string, role: Role, full_name?: string) =>
      withReload(call('/api/agents/invite', { method: 'POST', body: JSON.stringify({ email, role, full_name }) })),
    changeRole: (id: string, role: Role) =>
      withReload(call(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) })),
    remove: (id: string) => withReload(call(`/api/agents/${id}`, { method: 'DELETE' })),
    resend: (id: string) => call(`/api/agents/${id}/resend`, { method: 'POST' }),
  }
}
