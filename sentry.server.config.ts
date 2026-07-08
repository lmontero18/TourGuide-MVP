import * as Sentry from '@sentry/nextjs'
import { ImportUserError } from '@/lib/ai/errors'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? 'development',
  // Solo error tracking en M6 — tracing/performance queda para despues
  // (cuida la cuota del free tier).
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
  beforeSend(event, hint) {
    // ImportUserError = error operacional esperado (se muestra al usuario),
    // no es un bug — no reportar.
    if (hint.originalException instanceof ImportUserError) return null
    return event
  },
})
