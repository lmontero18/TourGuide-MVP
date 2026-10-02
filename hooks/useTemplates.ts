'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WhatsAppTemplate } from '@/types'
import { readCache, writeCache } from '@/lib/clientCache'

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

// Plantillas del WABA de la org via /api/templates (Meta es la fuente de verdad).
export function useTemplates() {
  const cached = readCache<{ templates: WhatsAppTemplate[]; connected: boolean }>('templates')
  const [templates, setTemplates] = useState<WhatsAppTemplate[] | null>(cached?.templates ?? null)
  const [connected, setConnected] = useState(cached?.connected ?? true)
  const [error, setError] = useState(false)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/templates')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: { templates: WhatsAppTemplate[]; connected: boolean }) => {
        writeCache('templates', body)
        if (cancelled) return
        setTemplates(body.templates)
        setConnected(body.connected)
        setError(false)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const create = useCallback(
    async (input: NewTemplate): Promise<Result> => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: body.error ?? '', code: body.code }
      reload()
      return { ok: true }
    },
    [reload]
  )

  const remove = useCallback(
    async (name: string): Promise<Result> => {
      const res = await fetch(`/api/templates/${name}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: body.error ?? '', code: body.code }
      reload()
      return { ok: true }
    },
    [reload]
  )

  return { templates, connected, error, create, remove, reload }
}
