import * as Sentry from '@sentry/nextjs'
import { ImportUserError } from '@/lib/ai/errors'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Explicito a proposito: el default de @sentry/nextjs ya es false, pero el
  // wizard suele generar `sendDefaultPii: true` y un upgrade o un copy-paste
  // mandaria cookies, headers Authorization e IPs a Sentry sin que salte nada.
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? 'development',
  // Solo error tracking en M6 — tracing/performance queda para despues
  // (cuida la cuota del free tier).
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
  beforeSend(event, hint) {
    // ImportUserError = error operacional esperado (se muestra al usuario),
    // no es un bug — no reportar.
    if (hint.originalException instanceof ImportUserError) return null
    // Header de estado del router malformado (ej. "?_rsc=test1"): lo mandan
    // scanners automaticos, el cliente de Next nunca lo genera. Next responde
    // el error y no hay nada que arreglar de nuestro lado.
    const message = hint.originalException instanceof Error ? hint.originalException.message : ''
    if (message.includes('router state header was sent but could not be parsed')) return null
    return event
  },
})
