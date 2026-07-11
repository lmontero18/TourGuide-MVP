import type { BusinessHours, WeeklyBusinessHours } from '@/types'

export const DEFAULT_RANGE: BusinessHours = { start: '09:00', end: '18:00' }
export const DEFAULT_TIMEZONE = 'America/Lima'

/**
 * Normaliza business_hours al formato semanal (weekdays/weekend). El formato
 * viejo (un solo rango) se trata como "el mismo horario todos los dias" —
 * preserva el comportamiento actual de orgs que no resavearon todavia, en
 * vez de asumir el finde cerrado (que seria un cambio de comportamiento
 * silencioso).
 */
export function normalizeBusinessHours(
  raw: BusinessHours | WeeklyBusinessHours | null | undefined,
): WeeklyBusinessHours {
  if (!raw) return { weekdays: DEFAULT_RANGE, weekend: DEFAULT_RANGE }
  if ('weekdays' in raw) return raw
  return { weekdays: raw, weekend: raw }
}

/**
 * Texto legible del horario para el prompt del bot.
 */
export function describeBusinessHours(hours: WeeklyBusinessHours): string {
  const weekdays = `Lunes a viernes: ${hours.weekdays.start} a ${hours.weekdays.end}.`
  const weekend = hours.weekend
    ? `Sabado y domingo: ${hours.weekend.start} a ${hours.weekend.end}.`
    : `Sabado y domingo: cerrado.`
  return `${weekdays} ${weekend}`
}
