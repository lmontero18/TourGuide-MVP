// Rate limiting con Upstash Redis (sliding window).
//
// FAIL OPEN por diseño: si las env vars no están o Redis falla, se permite el
// request. El flujo de mensajes de WhatsApp nunca puede cortarse por un
// problema del rate limiter — el costo de un flood puntual es menor que
// perder mensajes de clientes reales.
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger({ module: 'ratelimit' })

type LimiterName = 'webhook' | 'internal'

const LIMITS: Record<LimiterName, { tokens: number; window: `${number} s` }> = {
  // Webhook de Meta, por phone_number_id: un número activo real difícilmente
  // supere ~5 mensajes/segundo sostenidos.
  webhook: { tokens: 300, window: '60 s' },
  // Rutas internas de N8N, por ruta.
  internal: { tokens: 120, window: '60 s' },
}

const limiters = new Map<LimiterName, Ratelimit | null>()

function getLimiter(name: LimiterName): Ratelimit | null {
  if (!limiters.has(name)) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      // Env ausente (dev local, staging sin Redis) → deshabilitado.
      limiters.set(name, null)
    } else {
      limiters.set(
        name,
        new Ratelimit({
          redis: new Redis({ url, token }),
          limiter: Ratelimit.slidingWindow(LIMITS[name].tokens, LIMITS[name].window),
          prefix: `rl:${name}`,
          // Cache local del proceso: si una key ya está bloqueada evita el
          // round-trip a Redis en requests siguientes.
          ephemeralCache: new Map(),
        })
      )
    }
  }
  return limiters.get(name) ?? null
}

/** true = permitido, false = excedió el límite. Nunca lanza. */
export async function checkRateLimit(name: LimiterName, key: string): Promise<boolean> {
  const limiter = getLimiter(name)
  if (!limiter) return true
  try {
    const { success } = await limiter.limit(key)
    return success
  } catch (error) {
    log.warn('rate limit check failed — failing open', { error, name, key })
    return true
  }
}
