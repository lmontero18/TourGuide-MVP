import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Explicito a proposito: el default de @sentry/nextjs ya es false, pero el
  // wizard suele generar `sendDefaultPii: true` y un upgrade o un copy-paste
  // mandaria cookies, headers Authorization e IPs a Sentry sin que salte nada.
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? 'development',
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
})
