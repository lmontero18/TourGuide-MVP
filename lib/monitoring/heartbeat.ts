import 'server-only'
import type { Logger } from '@/lib/logger'

// Heartbeats de BetterStack: cada cron pingea su URL al terminar bien. Si el
// cron no corre o falla, el ping no llega y BetterStack avisa por email.
// Solo en el camino feliz, y nunca falla el cron por el ping: el trabajo ya
// se hizo. Sin la env var (dev, preview) no hace nada.
export type HeartbeatEnv =
  | 'BETTERSTACK_HEARTBEAT_CLEANUP_MEDIA'
  | 'BETTERSTACK_HEARTBEAT_AUTO_RESOLVE'
  | 'BETTERSTACK_HEARTBEAT_PG_CRON'
  | 'BETTERSTACK_HEARTBEAT_DAILY_SUMMARY'

export async function pingHeartbeat(env: HeartbeatEnv, log: Logger): Promise<void> {
  const url = process.env[env]
  if (!url) return
  await fetch(url, { signal: AbortSignal.timeout(10_000) }).catch((error) => {
    log.warn('heartbeat ping failed', { error, env })
  })
}
