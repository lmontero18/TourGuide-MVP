// Init de Sentry en el browser. Con Turbopack (default en Next 16) el
// sentry.client.config.ts legacy NO se auto-importa — la init del cliente
// debe vivir en este archivo.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
