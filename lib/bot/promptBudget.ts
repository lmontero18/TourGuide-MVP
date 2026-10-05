import 'server-only'
import * as Sentry from '@sentry/nextjs'
import type { Logger } from '@/lib/logger'
import { promptUsage, type CompilePromptInput } from '@/lib/bot/compilePrompt'

// Aviso interno cuando el catalogo de una agencia se acerca al tope del
// prompt (80%) o lo pasa (se recorta el final y el bot pierde datos). Es la
// senal para reintroducir RAG por agencia.
export function checkPromptBudget(input: CompilePromptInput, orgId: string, log: Logger) {
  const usage = promptUsage(input)
  if (usage.ratio < 0.8) return
  const truncated = usage.ratio > 1
  const extra = { chars: usage.chars, max: usage.max, percent: Math.round(usage.ratio * 100) }
  log.warn(truncated ? 'prompt truncated' : 'prompt near limit', { org_id: orgId, ...extra })
  Sentry.captureMessage(truncated ? 'Prompt del bot recortado (falta RAG)' : 'Prompt del bot cerca del tope', {
    level: truncated ? 'error' : 'warning',
    tags: { org_id: orgId, area: 'prompt-budget' },
    extra,
  })
}
