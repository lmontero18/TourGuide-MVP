'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Role, TeamMember } from '@/types'
import { readCache, writeCache } from '@/lib/clientCache'

type ActionResult = { ok: true } | { ok: false; error: string; code?: string }

async function call(url: string, init?: RequestInit): Promise<ActionResult> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({}))
  return { ok: false, error: body.error ?? 'Request failed', code: body.code }
}

// Gestion del equipo via /api/agents (auth.users solo se lee con service role).
export function useAgents() {
  const [agents, setAgents] = useState<TeamMember[] | null>(() => readCache<TeamMember[]>('agents') ?? null)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/agents')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: { agents: TeamMember[] }) => {
        writeCache('agents', body.agents)
        if (cancelled) return
        setAgents(body.agents)
        setError(false)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const withReload = useCallback(
    async (p: Promise<ActionResult>) => {
      const result = await p
      if (result.ok) reload()
      return result
    },
    [reload]
  )

  return {
    agents,
    error,
    invite: (email: string, role: Role, full_name?: string) =>
      withReload(call('/api/agents/invite', { method: 'POST', body: JSON.stringify({ email, role, full_name }) })),
    changeRole: (id: string, role: Role) =>
      withReload(call(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) })),
    remove: (id: string) => withReload(call(`/api/agents/${id}`, { method: 'DELETE' })),
    resend: (id: string) => call(`/api/agents/${id}/resend`, { method: 'POST' }),
  }
}
