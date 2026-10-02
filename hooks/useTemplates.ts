'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { WhatsAppTemplate } from '@/types'

export interface NewTemplate {
  name: string
  category: 'UTILITY' | 'MARKETING'
  language: string
  header?: string
  body: string
  footer?: string
  buttons?: { type: 'QUICK_REPLY' | 'URL'; text: string; url?: string }[]
  examples: Record<string, string>
}

// `error` vacio = la API no dio motivo: la UI muestra su mensaje traducido.
type Result = { ok: true } | { ok: false; error: string; code?: string }

interface TemplatesResponse {
  templates: WhatsAppTemplate[]
  connected: boolean
}

async function fetchTemplates(): Promise<TemplatesResponse> {
  const res = await fetch('/api/templates')
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

// Plantillas del WABA de la org via /api/templates (Meta es la fuente de verdad).
export function useTemplates() {
  const queryClient = useQueryClient()
  const { data, isError } = useQuery({ queryKey: queryKeys.templates, queryFn: fetchTemplates })
  const reload = useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.templates }), [queryClient])

  const create = useCallback(
    async (input: NewTemplate): Promise<Result> => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: body.error ?? '', code: body.code }
      void reload()
      return { ok: true }
    },
    [reload]
  )

  const remove = useCallback(
    async (name: string): Promise<Result> => {
      const res = await fetch(`/api/templates/${name}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: body.error ?? '', code: body.code }
      void reload()
      return { ok: true }
    },
    [reload]
  )

  return {
    templates: data?.templates ?? null,
    connected: data?.connected ?? true,
    error: isError,
    create,
    remove,
    reload,
  }
}
