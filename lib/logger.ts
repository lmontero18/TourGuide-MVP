// Logger estructurado para API routes y webhooks.
// En produccion emite una linea JSON por evento via console.* — Vercel la
// indexa y permite filtrar por campo (ej. org_id:<uuid> en Observability →
// Logs). En dev emite formato legible. Solo usa console, asi que funciona
// igual en runtime Node y Edge, sin dependencias.

type Level = 'debug' | 'info' | 'warn' | 'error'

// Contexto que acompana cada linea: org_id, conversation_id, route, wamid...
export type Bindings = Record<string, unknown>

export interface Logger {
  debug(msg: string, data?: Bindings): void
  info(msg: string, data?: Bindings): void
  warn(msg: string, data?: Bindings): void
  error(msg: string, data?: Bindings & { error?: unknown }): void
  child(bindings: Bindings): Logger
}

const isProd = process.env.NODE_ENV === 'production'

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }
// En prod se suprime debug salvo LOG_LEVEL=debug explicito.
const minLevel: Level = (process.env.LOG_LEVEL as Level) ?? (isProd ? 'info' : 'debug')

const CONSOLE_FN: Record<Level, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
}

// Serializa cualquier valor lanzado/devuelto como error sin filtrar de mas:
// Error → name/message/stack; PostgrestError y similares → message/code/details.
function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return {
      message: typeof e.message === 'string' ? e.message : String(err),
      ...(e.code !== undefined ? { code: e.code } : {}),
      ...(e.details !== undefined ? { details: e.details } : {}),
      ...(e.hint !== undefined ? { hint: e.hint } : {}),
    }
  }
  return { message: String(err) }
}

function emit(level: Level, bindings: Bindings, msg: string, data?: Bindings) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) return

  const { error, ...rest } = data ?? {}
  const fields: Bindings = { ...bindings, ...rest }
  if (error !== undefined) fields.err = serializeError(error)

  if (isProd) {
    CONSOLE_FN[level](
      JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields })
    )
    return
  }

  const context = Object.keys(fields).length ? fields : ''
  CONSOLE_FN[level](`[${level.toUpperCase()}] ${msg}`, context)
}

export function createLogger(bindings: Bindings = {}): Logger {
  return {
    debug: (msg, data) => emit('debug', bindings, msg, data),
    info: (msg, data) => emit('info', bindings, msg, data),
    warn: (msg, data) => emit('warn', bindings, msg, data),
    error: (msg, data) => emit('error', bindings, msg, data),
    child: (extra) => createLogger({ ...bindings, ...extra }),
  }
}
