import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captura errores server-side no manejados (rutas, RSC, proxy.ts).
// No cubre errores tragados por try/catch (ej. el after() del webhook de
// WhatsApp) — esos se capturan manualmente con Sentry.captureException.
export const onRequestError = Sentry.captureRequestError
